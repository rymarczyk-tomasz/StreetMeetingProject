// Timeline + "what next" text for a participant's submission.

export type StepState = "done" | "current" | "todo" | "failed";

function formatDate(date) {
    if (!date) return "";
    return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long" }).format(
        new Date(`${date}T12:00:00`),
    );
}

export function submissionSteps(submission) {
    const { status, paymentStatus, checkedInAt } = submission;
    const approved = status === "approved";
    const rejected = status === "rejected";
    const paid = paymentStatus === "paid";

    return [
        { label: "Zgłoszone", state: "done" as StepState },
        {
            label: rejected ? "Odrzucone" : "Rozpatrzone",
            state: (rejected ? "failed" : approved ? "done" : "current") as StepState,
        },
        {
            label: "Opłacone",
            state: (rejected ? "todo" : paid ? "done" : approved ? "current" : "todo") as StepState,
        },
        {
            label: checkedInAt ? "Na miejscu" : "Gotowe do wjazdu",
            state: (paid ? "done" : "todo") as StepState,
        },
    ];
}

// One sentence telling the participant what happens next (or what to do).
export function nextStep(submission) {
    const { status, paymentStatus, payment } = submission;

    if (status === "pending") {
        return "Czekamy na decyzję organizatora. Do tego czasu możesz poprawić dane i zdjęcia albo wycofać zgłoszenie.";
    }
    if (status === "rejected") {
        return "Zgłoszenie nie zostało zakwalifikowane. Sprawdź komentarz organizatora poniżej.";
    }
    if (paymentStatus === "verification") {
        return "Organizator sprawdza Twoją płatność — damy znać po jej potwierdzeniu.";
    }
    if (paymentStatus === "paid") {
        return "Wszystko gotowe! Pokaż wejściówkę z kodem QR przy wjeździe.";
    }
    const amount = payment?.amount ? ` ${payment.amount}` : "";
    const deadline = payment?.deadline ? ` do ${formatDate(payment.deadline)}` : "";
    return `Gratulacje, auto jest zakwalifikowane! Opłać składkę${amount}${deadline} i zgłoś opłatę poniżej.`;
}
