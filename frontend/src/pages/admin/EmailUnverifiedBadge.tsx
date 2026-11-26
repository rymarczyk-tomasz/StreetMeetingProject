import { formatDay } from "./shared";

export default function EmailUnverifiedBadge({ registeredAt }) {
    const day = registeredAt ? formatDay(String(registeredAt).slice(0, 10)) : "";
    return (
        <span
            className="status-badge status-pending"
            title="Uczestnik nie kliknął linku z e-maila. Bez potwierdzenia nie zgłosi auta."
        >
            E-mail niepotwierdzony{day ? ` · rejestracja ${day}` : ""}
        </span>
    );
}
