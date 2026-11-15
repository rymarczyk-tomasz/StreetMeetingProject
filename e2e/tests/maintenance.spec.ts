// Maintenance mode: visitors get the notice screen, the admin keeps the real site.
import { test, expect, adminPage } from "./fixtures";

const TITLE = "Wracamy za chwilę";

test("tryb serwisowy: odwiedzający widzą planszę, admin stronę z przypomnieniem", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const admin = await adminPage(browser);
    try {
        await admin.goto("/admin/ustawienia?zakladka=serwis");
        await admin.getByLabel("Włącz tryb serwisowy (strona w przebudowie)").check();
        await admin.getByLabel("Tytuł planszy").fill(TITLE);
        await admin.getByLabel("Komunikat dla odwiedzających").fill("Poprawiamy treści strony.");
        const saved = admin.waitForResponse(
            (response) =>
                response.url().includes("/api/admin/content/maintenance") && response.request().method() === "PATCH",
        );
        await admin.getByRole("button", { name: "Zapisz", exact: true }).click();
        expect((await saved).status()).toBe(200);

        // a visitor: only the notice, no menu, but the login page still opens
        await page.goto("/faq");
        await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
        await expect(page.getByText("Poprawiamy treści strony.")).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Główna" })).toHaveCount(0);
        await page.getByRole("link", { name: "Logowanie dla organizatorów" }).click();
        await expect(page).toHaveURL(/logowanie/);
        await expect(page.getByRole("button", { name: "Zaloguj się" })).toBeVisible();
        await expect(page.getByRole("heading", { name: TITLE })).toHaveCount(0);

        // the admin sees the real page plus a reminder with a way back to the switch
        await admin.goto("/faq");
        await expect(admin.getByText(/Tryb serwisowy jest włączony/)).toBeVisible();
        await expect(admin.getByRole("navigation", { name: "Główna" })).toBeVisible();
        await admin.getByRole("link", { name: "Zmień" }).click();
        await expect(admin.getByLabel("Włącz tryb serwisowy (strona w przebudowie)")).toBeChecked();
    } finally {
        // other specs share this database, so it must not stay closed
        await admin.request.patch("/api/admin/content/maintenance", {
            data: { content: { enabled: false, title: "Strona w przebudowie", message: "" } },
        });
        await admin.context().close();
    }

    await page.goto("/faq");
    await expect(page.getByRole("navigation", { name: "Główna" })).toBeVisible();
    await expect(page.getByRole("heading", { name: TITLE })).toHaveCount(0);
});
