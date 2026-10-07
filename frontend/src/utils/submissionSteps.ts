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
    const rejected = status === "rejected" || status === "withdrawn";
    const paid = paymentStatus === "paid";
    // "Opłacone" only becomes the current step once there is something to pay.
    const paymentReady = submission.payment?.complete !== false;

    return [
        { label: "Zgłoszone", state: "done" as StepState },
        {
            label:
                status === "withdrawn"
                    ? "Rezygnacja"
                    : rejected
                      ? "Odrzucone"
                      : status === "waitlist"
                        ? "Lista rezerwowa"
                        : "Rozpatrzone",
            state: (rejected ? "failed" : approved ? "done" : "current") as StepState,
        },
        {
            label: "Opłacone",
            state: (rejected ? "todo" : paid ? "done" : approved && paymentReady ? "current" : "todo") as StepState,
        },
        {
            label: checkedInAt ? "Na miejscu" : "Gotowe do wjazdu",
            state: (paid ? "done" : "todo") as StepState,
        },
    ];
}

// One sentence telling the participant what happens next (or what to do).
export function nextStep(submission) {
    const { status, paymentStatus, payment, paymentOverdue } = submission;

    if (status === "pending") {
        return "Czekamy na decyzję organizatora. Do tego czasu możesz poprawić dane i zdjęcia albo wycofać zgłoszenie.";
    }
    if (status === "waitlist") {
        return "Auto jest na liście rezerwowej. Gdy zwolnią się miejsca, organizator wybierze auta z listy — jeśli Twoje zostanie zaakceptowane, dostaniesz e-mail z danymi do opłaty.";
    }
    if (status === "withdrawn") {
        return "Rezygnacja z udziału w tej edycji jest zapisana. Jeśli to pomyłka, napisz do organizatora.";
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
    if (payment && !payment.complete) {
        return "Gratulacje, auto jest zakwalifikowane! Dane do opłaty wyślemy wkrótce.";
    }
    if (paymentOverdue) {
        return "Termin opłaty minął. Opłać składkę jak najszybciej i zgłoś ją poniżej — inaczej miejsce może przejść na osobę z listy rezerwowej.";
    }
    const amount = payment?.amount ? ` ${payment.amount}` : "";
    const deadline = payment?.deadline ? ` do ${formatDate(payment.deadline)}` : "";
    return `Gratulacje, auto jest zakwalifikowane! Opłać składkę${amount}${deadline} i zgłoś opłatę poniżej.`;
}
