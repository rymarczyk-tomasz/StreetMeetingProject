import api from "../../api/client";
import { PAYMENT_STATUS_LABELS } from "./shared";

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export async function printGateList(edition) {
    // Open synchronously (inside the click) so pop-up blockers allow it.
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        throw new Error("Przeglądarka zablokowała nowe okno — zezwól na wyskakujące okna.");
    }
    printWindow.document.write("<p>Przygotowywanie listy…</p>");

    const { data } = await api.get("/admin/submissions", {
        params: { edition: edition || undefined, status: "approved", purpose: "gate-list" },
    });
    const rows = [...data.submissions].sort((a, b) =>
        a.licensePlate.localeCompare(b.licensePlate, "pl", { numeric: true }),
    );
    const year = rows[0]?.edition ?? edition ?? "";

    const tableRows = rows
        .map(
            (s, index) => `
            <tr>
                <td>${index + 1}</td>
                <td class="plate">${escapeHtml(s.licensePlate)}</td>
                <td>${escapeHtml(s.carBrand)}</td>
                <td>${escapeHtml(`${s.firstName} ${s.lastName}`)}</td>
                <td>${escapeHtml(s.phone)}</td>
                <td>${escapeHtml(PAYMENT_STATUS_LABELS[s.paymentStatus] || s.paymentStatus)}</td>
                <td class="check"></td>
            </tr>`,
        )
        .join("");

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html lang="pl"><head><meta charset="utf-8">
<title>Lista wjazdu – strefa Select ${escapeHtml(year)}</title>
<style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    p { margin: 0 0 16px; color: #555; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
    th { background: #eee; }
    .plate { font-weight: bold; font-family: monospace; font-size: 15px; white-space: nowrap; }
    .check { width: 70px; }
    tr { page-break-inside: avoid; }
</style></head>
<body>
    <h1>Strefa Select ${escapeHtml(year)} – lista wjazdu</h1>
    <p>Zaakceptowane pojazdy: ${rows.length} · wygenerowano ${new Date().toLocaleString("pl-PL")}</p>
    <table>
        <thead><tr><th>#</th><th>Rejestracja</th><th>Marka</th><th>Uczestnik</th><th>Telefon</th><th>Opłata</th><th>Wjazd ✓</th></tr></thead>
        <tbody>${tableRows || '<tr><td colspan="7">Brak zaakceptowanych zgłoszeń.</td></tr>'}</tbody>
    </table>
    <script>window.onload = () => window.print();</script>
</body></html>`);
    printWindow.document.close();
}
