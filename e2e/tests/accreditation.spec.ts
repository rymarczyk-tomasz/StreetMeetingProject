import { test, expect, adminPage, uniqueEmail, waitForMail } from "./fixtures";

test("akredytacja: wniosek bez konta, akceptacja w panelu, mail z decyzją", async ({ page, browser, consoleErrors }) => {
    const email = uniqueEmail("media");
    await page.goto("/");
    await page.locator("footer").last().getByRole("link", { name: "Akredytacje medialne" }).click();
    await expect(page.getByRole("heading", { name: "Akredytacje medialne" })).toBeVisible();
    await page.getByLabel("Imię i nazwisko").fill("Anna Medialna");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Telefon").fill("500 600 700");
    await page.getByLabel("Link do Instagrama").fill("instagram.com/anna.medialna");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Wyślij wniosek" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Dziękujemy" })).toBeVisible();

    const admin = await adminPage(browser);
    await admin.goto("/admin/akredytacje");
    const row = admin.getByRole("row").filter({ hasText: email });
    const badge = admin.getByTitle("Oczekujące akredytacje");
    await expect(badge).toHaveText(/^[1-9]/);
    const waiting = Number(await badge.innerText());
    await row.getByRole("button", { name: "Akceptuj" }).click();
    const dialog = admin.getByRole("dialog", { name: "Przyznanie akredytacji" });
    const body = dialog.getByLabel("Treść");
    await expect(body).toHaveValue(/została przyznana/);
    await body.fill(`${await body.inputValue()}\n\nOdbiór przy bramie C.`);
    await dialog.getByRole("button", { name: "Akceptuj i wyślij" }).click();
    await expect(row.getByText("Zaakceptowana")).toBeVisible();
    if (waiting === 1) await expect(badge).toHaveCount(0);
    else await expect(badge).toHaveText(String(waiting - 1));

    const filters = admin.getByRole("group", { name: "Status wniosków" });
    for (const [label, shown] of [["Odrzucone", 0], ["Oczekujące", 0], ["Zaakceptowane", 1], ["Wszystkie", 1]] as const) {
        await filters.getByRole("button", { name: new RegExp(label) }).click();
        await expect(row).toHaveCount(shown);
    }

    const mail = await waitForMail(email, /akredytacja medialna/i);
    expect(mail.text).toContain("została przyznana");
    expect(mail.text).toContain("Odbiór przy bramie C.");
    await admin.context().close();
    void consoleErrors;
});
