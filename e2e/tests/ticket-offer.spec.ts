// Ticket price for Google: set in the panel, only in the event's JSON-LD, never shown on the page.
import { test, expect, adminPage } from "./fixtures";

async function eventJsonLd(page) {
    const script = page.locator('script[type="application/ld+json"]');
    await expect(script).toHaveCount(1);
    return JSON.parse((await script.textContent()) || "{}");
}

test("cena biletu od trafia do danych dla Google, nie na stronę", async ({ page, browser, consoleErrors }) => {
    const admin = await adminPage(browser);
    // JSON-LD needs an event date; the shared e2e db has none, so set one and put it back
    const edition = (await (await admin.request.get("/api/admin/content/edition")).json()).content;
    await admin.request.patch("/api/admin/content/edition", { data: { content: { ...edition, date: "2027-05-29" } } });
    try {
        await admin.goto("/admin/tresci?zakladka=home");
        await admin.getByLabel("Cena biletu od (zł)").fill("65");
        await admin.getByLabel("Sprzedaż biletów od").fill("2026-11-01");
        const saved = admin.waitForResponse(
            (response) => response.url().includes("/api/admin/content/home") && response.request().method() === "PATCH",
        );
        await admin.getByRole("button", { name: "Zapisz sekcję Home" }).click();
        expect((await saved).status()).toBe(200);

        await page.goto("/");
        await expect(page.getByRole("heading", { name: /Street Show/i }).first()).toBeVisible();
        await expect.poll(async () => (await eventJsonLd(page)).offers?.price).toBe("65");
        const ld = await eventJsonLd(page);
        expect(ld.offers).toMatchObject({ priceCurrency: "PLN", validFrom: "2026-11-01T00:00:00+01:00" });
        await expect(page.locator("body")).not.toContainText("65 zł");
        await expect(page.locator("body")).not.toContainText("Cena biletu");

        await admin.getByLabel("Cena biletu od (zł)").fill("");
        await admin.getByLabel("Sprzedaż biletów od").fill("");
        const cleared = admin.waitForResponse(
            (response) => response.url().includes("/api/admin/content/home") && response.request().method() === "PATCH",
        );
        await admin.getByRole("button", { name: "Zapisz sekcję Home" }).click();
        expect((await cleared).status()).toBe(200);
        await page.reload();
        await expect.poll(async () => "offers" in (await eventJsonLd(page))).toBe(false);
    } finally {
        await admin.request.patch("/api/admin/content/edition", { data: { content: edition } });
        await admin.context().close();
    }
    void consoleErrors;
});
