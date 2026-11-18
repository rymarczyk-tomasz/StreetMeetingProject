import { ZONE_LABELS } from "./zones";

type DecisionSubmission = { carBrand: string; licensePlate: string; status: string };

// Approve / waitlist / reject e-mail the participant at once, so the admin confirms first.
// null = no question (e.g. back to pending, which sends nothing).
export function decisionQuestion(submission: DecisionSubmission, status: string, note?: string, zone?: string) {
    const car = `${submission.carBrand} (${submission.licensePlate})`;
    const comment = note?.trim() ? " razem z Twoim komentarzem" : "";
    const losesPlace = submission.status === "approved" ? " Auto straci przyznane miejsce." : "";

    if (status === "approved") {
        return {
            title: "Zaakceptować zgłoszenie?",
            message: `${car} — miejsce: ${ZONE_LABELS[zone || ""] || "nie wybrano"}. Uczestnik od razu dostanie e-mail akceptacji dla tego miejsca z danymi do płatności${comment}.`,
            confirmLabel: "Zaakceptuj i wyślij e-mail",
        };
    }
    if (status === "waitlist") {
        return {
            title: "Przenieść na listę rezerwową?",
            message: `${car}. Uczestnik od razu dostanie e-mail, że jest na liście rezerwowej${comment}.${losesPlace}`,
            confirmLabel: "Na rezerwową i wyślij e-mail",
        };
    }
    if (status === "rejected") {
        return {
            title: "Odrzucić zgłoszenie?",
            message: `${car}. Uczestnik od razu dostanie e-mail z odmową${comment}.${losesPlace}`,
            confirmLabel: "Odrzuć i wyślij e-mail",
            danger: true,
        };
    }
    return null;
}
