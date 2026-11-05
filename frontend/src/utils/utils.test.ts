// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { plural } from "./plural";
import { nextStep, submissionSteps } from "./submissionSteps";
import {
    applyQueue,
    enqueueCheckin,
    loadQueue,
    loadSavedCars,
    removeFromQueue,
    saveCars,
    tokenFromCode,
} from "./gateOffline";
import { buildEventJsonLd, formatEditionHours } from "./edition";
import { faqFirstNumbers } from "./faq";
import { transformWordHtml } from "./wordPaste";

describe("plural", () => {
    test.each([
        [1, "1 zdjęcie"],
        [2, "2 zdjęcia"],
        [4, "4 zdjęcia"],
        [5, "5 zdjęć"],
        [0, "0 zdjęć"],
        [12, "12 zdjęć"],
        [14, "14 zdjęć"],
        [21, "21 zdjęć"],
        [22, "22 zdjęcia"],
        [112, "112 zdjęć"],
        [124, "124 zdjęcia"],
    ])("%i", (count, expected) => {
        expect(plural(count, "zdjęcie", "zdjęcia", "zdjęć")).toBe(expected);
    });
});

describe("submissionSteps", () => {
    const states = (submission) => submissionSteps(submission).map((step) => step.state);

    test("oczekujące", () => {
        expect(states({ status: "pending", paymentStatus: "unpaid" })).toEqual(["done", "current", "todo", "todo"]);
    });

    test("zaakceptowane czeka na opłatę", () => {
        expect(states({ status: "approved", paymentStatus: "unpaid", payment: { complete: true } })).toEqual([
            "done",
            "done",
            "current",
            "todo",
        ]);
    });

    test("bez danych do przelewu opłata nie jest jeszcze bieżącym krokiem", () => {
        expect(states({ status: "approved", paymentStatus: "unpaid", payment: { complete: false } })[2]).toBe("todo");
    });

    test("opłacone = gotowe do wjazdu", () => {
        expect(states({ status: "approved", paymentStatus: "paid" })).toEqual(["done", "done", "done", "done"]);
    });

    test("odrzucone i rezygnacja", () => {
        expect(states({ status: "rejected" })[1]).toBe("failed");
        expect(submissionSteps({ status: "withdrawn" })[1].label).toBe("Rezygnacja");
    });

    test("nextStep: weryfikacja ma pierwszeństwo przed terminem", () => {
        const text = nextStep({ status: "approved", paymentStatus: "verification", paymentOverdue: true, payment: { complete: true } });
        expect(text).toMatch(/sprawdza Twoją płatność/);
    });

    test("nextStep: po terminie", () => {
        const text = nextStep({ status: "approved", paymentStatus: "unpaid", paymentOverdue: true, payment: { complete: true } });
        expect(text).toMatch(/Termin opłaty minął/);
    });

    test("nextStep: kwota i termin w treści", () => {
        const text = nextStep({
            status: "approved",
            paymentStatus: "unpaid",
            payment: { complete: true, amount: "150 zł", deadline: "2027-06-01" },
        });
        expect(text).toContain("150 zł");
        expect(text).toContain("1 czerwca");
    });
});

describe("gateOffline", () => {
    beforeEach(() => localStorage.clear());

    const entry = (id, at, checkedIn = true) => ({ id, at, checkedIn, licensePlate: `GD ${id}` });

    test("tokenFromCode rozumie te same formaty co serwer", () => {
        const token = "0123456789abcdef01234567";
        expect(tokenFromCode(`https://streetshow.pl/wjazd?kod=SSP-${token}`)).toBe(token);
        expect(tokenFromCode(`SSP-${token.toUpperCase()}`)).toBe(token);
        expect(tokenFromCode("SSP-ABCD-EFGH")).toBe("abcdefgh");
        expect(tokenFromCode("ssp abcd efgh")).toBe("abcdefgh");
        expect(tokenFromCode("SSP-ABCD-EFG1")).toBeNull(); // 1 is not in the alphabet
        expect(tokenFromCode("https://x.pl/?kod=%E0%A4%A")).toBeNull();
        expect(tokenFromCode("")).toBeNull();
    });

    test("kolejka trzyma jeden wpis na auto, ostatni wygrywa", () => {
        enqueueCheckin(entry(1, "2027-06-01T10:00:00.000Z"));
        enqueueCheckin(entry(2, "2027-06-01T10:01:00.000Z"));
        enqueueCheckin(entry(1, "2027-06-01T10:02:00.000Z", false));
        const queue = loadQueue();
        expect(queue.map((item) => item.id)).toEqual([2, 1]);
        expect(queue[1].checkedIn).toBe(false);
    });

    test("wysłany wpis nie usuwa nowszego kliknięcia tego samego auta", () => {
        const sent = entry(1, "2027-06-01T10:00:00.000Z");
        enqueueCheckin(sent);
        enqueueCheckin(entry(1, "2027-06-01T10:05:00.000Z"));
        expect(removeFromQueue(sent)).toHaveLength(1);
        removeFromQueue(entry(1, "2027-06-01T10:05:00.000Z"));
        expect(loadQueue()).toEqual([]);
    });

    test("applyQueue nakłada lokalne check-iny na listę", () => {
        const cars = [{ id: 1, checkedInAt: null }, { id: 2, checkedInAt: "2027-06-01 09:00:00" }];
        const result = applyQueue(cars, [entry(1, "2027-06-01T10:00:00.000Z"), entry(2, "2027-06-01T10:01:00.000Z", false)]);
        expect(result[0]).toMatchObject({ checkedInAt: "2027-06-01 10:00:00", pendingSync: true });
        expect(result[1]).toMatchObject({ checkedInAt: null, pendingSync: true });
    });

    test("zepsuty localStorage nie wywraca bramki", () => {
        localStorage.setItem("gate.cars.v1", "{nie json");
        localStorage.setItem("gate.queue.v1", '{"a":1}');
        expect(loadSavedCars()).toBeNull();
        expect(loadQueue()).toEqual([]);
        saveCars([{ id: 1 }], "2027-06-01T10:00:00.000Z");
        expect(loadSavedCars()?.cars).toEqual([{ id: 1 }]);
    });
});

describe("edition", () => {
    test("godziny", () => {
        expect(formatEditionHours({ startTime: "12:00", endTime: "18:00" })).toBe("12:00 – 18:00");
        expect(formatEditionHours({ startTime: "12:00" })).toBe("od 12:00");
        expect(formatEditionHours({})).toBe("");
    });

    test("JSON-LD tylko gdy jest data", () => {
        expect(buildEventJsonLd({ dateText: "Termin wkrótce" }, { ticketUrl: "", contact: null })).toBeNull();
        const ld = buildEventJsonLd(
            { name: "Street Show 2027", date: "2027-06-01", startTime: "12:00", venueName: "Arena" },
            { ticketUrl: "", contact: { facebookUrl: "https://fb.com/x", instagramUrl: "" } },
        );
        expect(ld.startDate).toBe("2027-06-01T12:00");
        expect(ld).not.toHaveProperty("endDate");
        expect(ld).not.toHaveProperty("offers");
        expect(ld.organizer.sameAs).toEqual(["https://fb.com/x"]);
    });
});

test("faqFirstNumbers numeruje pytania przez kategorie", () => {
    expect(faqFirstNumbers({ categories: [{ items: [1, 2] }, { items: [] }, { items: [1] }] })).toEqual([1, 3, 3]);
});

describe("wklejanie z Worda", () => {
    const p = (level, marker, text, list = "l0") =>
        `<p style="mso-list:${list} level${level} lfo1"><span style="mso-list:Ignore">${marker}</span>${text}</p>`;

    test("zwykły html przechodzi bez zmian", () => {
        expect(transformWordHtml("<p>abc</p>")).toBe("<p>abc</p>");
    });

    test("odbudowuje zagnieżdżoną listę numerowaną", () => {
        const html = transformWordHtml(p(1, "1.", "Pierwszy") + p(2, "a)", "Pod") + p(1, "2.", "Drugi"));
        expect(html).toBe('<ol><li>Pierwszy<ol type="a"><li>Pod</li></ol></li><li>Drugi</li></ol>');
    });

    test("punktory dają ul, a akapit przerywa listę", () => {
        const html = transformWordHtml(p(1, "•", "A") + "<p>przerwa</p>" + p(1, "•", "B"));
        expect(html).toBe("<ul><li>A</li></ul><p>przerwa</p><ul><li>B</li></ul>");
    });
});
