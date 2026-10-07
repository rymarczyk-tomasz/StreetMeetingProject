import api from "../../api/client";

export const STATUS_LABELS = {
    pending: "Oczekuje",
    approved: "Zaakceptowane",
    rejected: "Odrzucone",
    waitlist: "Lista rezerwowa",
    withdrawn: "Rezygnacja",
};

export const PAYMENT_STATUS_LABELS = {
    unpaid: "Do opłacenia",
    verification: "Do weryfikacji",
    paid: "Opłacone",
};

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

export async function uploadContentImage(file) {
    const formData = new FormData();
    formData.append("image", file);
    // Let the browser set the multipart Content-Type (with boundary) itself;
    // forcing it manually breaks upload parsing on the server.
    const { data } = await api.post("/admin/upload-image", formData);
    return data.url;
}

export function errorMessage(err, fallback) {
    return err.response?.data?.message || fallback;
}

export function formatDay(day) {
    if (!day) return "";
    return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(new Date(`${day}T12:00:00`));
}

export function formatDate(value) {
    if (!value) return "Brak daty";

    return new Intl.DateTimeFormat("pl-PL", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(`${value.replace(" ", "T")}Z`));
}
