const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { api, createUser, createSubmission, submissionsDb } = require("./helpers");

const staff = () => createUser({ gateStaff: true });

function withPass(submission) {
    return submissionsDb.ensurePassToken(submission.id, require("crypto").randomBytes(12).toString("hex"));
}

describe("dostęp do bramki", () => {
    test("zwykły użytkownik nie widzi listy aut ani nie sprawdza kodów", async () => {
        const client = api(createUser());
        assert.equal((await client.get("/api/gate/cars")).status, 403);
        assert.equal((await client.get("/api/gate/check?code=x")).status, 403);
        assert.equal((await api().get("/api/gate/cars")).status, 401);
    });

    test("obsługa bramki i admin mają dostęp", async () => {
        assert.equal((await api(staff()).get("/api/gate/cars")).status, 200);
        assert.equal((await api(createUser({ role: "admin" })).get("/api/gate/cars")).status, 200);
    });

    test("lista aut nie zawiera danych osobowych ani surowych kodów", async () => {
        withPass(createSubmission(createUser(), { status: "approved", paymentStatus: "paid" }));
        const res = await api(staff()).get("/api/gate/cars");
        const car = res.body.cars[0];
        for (const field of ["phone", "email", "pass_token", "passToken", "photos", "admin_note"]) {
            assert.equal(car[field], undefined, field);
        }
        assert.match(car.passHash, /^[a-f0-9]{64}$/);
    });
});

describe("sprawdzanie kodu", () => {
    test("rozpoznaje link z QR, SSP-token i krótki kod w dowolnym zapisie", async () => {
        const row = withPass(createSubmission(createUser(), { status: "approved", paymentStatus: "paid" }));
        const client = api(staff());
        const short = row.pass_short_code;
        for (const code of [
            `https://streetshow.pl/wjazd?kod=SSP-${row.pass_token}`,
            `SSP-${row.pass_token}`,
            row.pass_token.toUpperCase(),
            `SSP-${short.slice(0, 4)}-${short.slice(4)}`,
            short.toLowerCase(),
        ]) {
            const res = await client.get("/api/gate/check").query({ code });
            assert.equal(res.status, 200, code);
            assert.equal(res.body.car.id, row.id);
            assert.equal(res.body.car.valid, true);
        }
    });

    test("nieznany kod daje 404", async () => {
        const res = await api(staff()).get("/api/gate/check").query({ code: "SSP-ZZZZ-ZZZZ" });
        assert.equal(res.status, 404);
    });

    test("wejściówka bez potwierdzonej opłaty jest nieważna", async () => {
        const row = withPass(createSubmission(createUser(), { status: "approved", paymentStatus: "verification" }));
        const res = await api(staff()).get("/api/gate/check").query({ code: row.pass_short_code });
        assert.equal(res.body.car.valid, false);
    });
});

describe("check-in", () => {
    test("wpuszcza tylko zaakceptowane i opłacone", async () => {
        const client = api(staff());
        const unpaid = createSubmission(createUser(), { status: "approved", paymentStatus: "verification" });
        const pending = createSubmission(createUser(), { paymentStatus: "paid" });
        assert.equal((await client.post(`/api/gate/cars/${unpaid.id}/checkin`)).status, 400);
        assert.equal((await client.post(`/api/gate/cars/${pending.id}/checkin`)).status, 404);
        assert.equal(submissionsDb.findSubmissionById(unpaid.id).checked_in_at, null);
    });

    test("drugi check-in zachowuje czas pierwszego", async () => {
        const row = createSubmission(createUser(), { status: "approved", paymentStatus: "paid" });
        const client = api(staff());
        const first = await client.post(`/api/gate/cars/${row.id}/checkin`);
        assert.equal(first.status, 200);
        const at = first.body.car.checkedInAt;
        assert.ok(at);

        const second = await client
            .post(`/api/gate/cars/${row.id}/checkin`)
            .send({ checkedInAt: new Date(Date.now() - 60_000).toISOString() });
        assert.equal(second.body.car.checkedInAt, at);
    });

    test("czas z trybu offline jest brany pod uwagę tylko z ostatnich 2 dni", async () => {
        const client = api(staff());
        const recent = createSubmission(createUser(), { status: "approved", paymentStatus: "paid" });
        const old = createSubmission(createUser(), { status: "approved", paymentStatus: "paid" });

        const tenMinutesAgo = new Date(Date.now() - 10 * 60_000);
        const r1 = await client.post(`/api/gate/cars/${recent.id}/checkin`).send({ checkedInAt: tenMinutesAgo.toISOString() });
        assert.equal(r1.body.car.checkedInAt, tenMinutesAgo.toISOString().slice(0, 19).replace("T", " "));

        const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
        const r2 = await client.post(`/api/gate/cars/${old.id}/checkin`).send({ checkedInAt: weekAgo });
        assert.notEqual(r2.body.car.checkedInAt, weekAgo.slice(0, 19).replace("T", " "));
        const age = Date.now() - new Date(`${r2.body.car.checkedInAt.replace(" ", "T")}Z`).getTime();
        assert.ok(age < 60_000);
    });

    test("cofnięcie check-inu", async () => {
        const row = createSubmission(createUser(), { status: "approved", paymentStatus: "paid" });
        const client = api(staff());
        await client.post(`/api/gate/cars/${row.id}/checkin`);
        const undo = await client.post(`/api/gate/cars/${row.id}/checkin`).send({ checkedIn: false });
        assert.equal(undo.body.car.checkedInAt, null);
    });
});
