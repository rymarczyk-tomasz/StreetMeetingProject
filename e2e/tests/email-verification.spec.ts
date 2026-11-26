// Admin panel: who hasn't confirmed their e-mail, and resending the link (never confirming it by hand).
import { test, expect, adminPage, linkFrom, register, uniqueEmail, waitForMail } from "./fixtures";

test("admin widzi niepotwierdzony e-mail, filtruje i wysyła link ponownie z limitem", async ({ page, browser, consoleErrors }) => {
    const email = uniqueEmail("niepotwierdzony");
    await register(page, email);

    const admin = await adminPage(browser);
    await admin.goto("/admin/uzytkownicy");
    await admin.getByLabel("Szukaj użytkownika").fill(email);
    const row = admin.locator(".user-row", { hasText: email });
    await expect(row.getByText(/E-mail niepotwierdzony · rejestracja/)).toBeVisible();

    await admin.getByLabel("Tylko niepotwierdzone").check();
    await expect(row).toBeVisible();

    // the link from registration went out a moment ago, so the next one has to wait
    await admin.getByRole("button", { name: `Akcje dla ${email}` }).click();
    await expect(admin.getByRole("menuitem", { name: /Potwierdź/ })).toHaveCount(0);
    await admin.getByRole("menuitem", { name: "Wyślij ponownie link potwierdzający" }).click();
    await expect(admin.getByText(/Link wysłano niedawno/)).toBeVisible();

    // the owner confirms through the link, then the badge and the menu item are gone
    const mail = await waitForMail(email, /potwierdź adres e-mail/);
    await page.goto(linkFrom(mail, "/potwierdz-email"));
    await expect(page.getByText(/potwierdzony/i).first()).toBeVisible();

    await admin.getByLabel("Tylko niepotwierdzone").uncheck();
    await admin.reload();
    await admin.getByLabel("Szukaj użytkownika").fill(email);
    await expect(row).toBeVisible();
    await expect(row.getByText(/E-mail niepotwierdzony/)).toHaveCount(0);
    await admin.getByRole("button", { name: `Akcje dla ${email}` }).click();
    await expect(admin.getByRole("menuitem", { name: "Wyślij ponownie link potwierdzający" })).toHaveCount(0);

    await admin.goto("/admin/uzytkownicy");
    await admin.getByLabel("Tylko niepotwierdzone").check();
    await admin.getByLabel("Szukaj użytkownika").fill(email);
    await expect(admin.getByText("0 użytkowników")).toBeVisible();
    await admin.context().close();
    void consoleErrors;
});
