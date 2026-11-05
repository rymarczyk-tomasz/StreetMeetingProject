import { test, expect } from "./fixtures";

const PUBLIC_PAGES: [string, RegExp][] = [
    ["/", /Street Show/i],
    ["/faq", /FAQ|Pytania/i],
    ["/regulamin", /Regulamin/i],
    ["/polityka-prywatnosci", /Polityka prywatności/i],
    ["/galeria", /Galeria/i],
    ["/logowanie", /Logowanie/i],
    ["/rejestracja", /Rejestracja/i],
    ["/nie-pamietam-hasla", /hasł/i],
];

for (const [path, heading] of PUBLIC_PAGES) {
    test(`strona ${path} działa bez błędów`, async ({ page, consoleErrors }) => {
        const failed: string[] = [];
        page.on("response", (res) => {
            if (res.url().includes("/api/") && res.status() >= 500) failed.push(`${res.status()} ${res.url()}`);
        });
        await page.goto(path);
        await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
        expect(failed, "błędy serwera API").toEqual([]);
        void consoleErrors;
    });
}

test("stopka: link do portfolio, bez GitHuba", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer").last();
    const author = footer.getByRole("link", { name: "Tomasz Rymarczyk" });
    await expect(author).toHaveAttribute("href", "https://tomaszrymarczyk.pl");
    await expect(footer.getByRole("link", { name: /github/i })).toHaveCount(0);
    await expect(footer.locator('a[href*="github.com"]')).toHaveCount(0);
});

test("chronione strony przekierowują niezalogowanego do logowania", async ({ page }) => {
    for (const path of ["/panel", "/formularz", "/admin", "/ustawienia-konta", "/garaz"]) {
        await page.goto(path);
        await expect(page, path).toHaveURL(/logowanie/);
    }
});

test("nieistniejący adres API zwraca 404 JSON", async ({ request }) => {
    const res = await request.get("/api/nie-ma-takiego");
    expect(res.status()).toBe(404);
});
