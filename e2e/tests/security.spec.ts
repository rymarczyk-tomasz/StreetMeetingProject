// Admin account protection: two-step login, step-up for sensitive actions, alerts.
import {
    test,
    expect,
    ADMIN,
    PASSWORD,
    adminPage,
    confirmStepUp,
    login,
    mailsTo,
    register,
    totpCode,
    uniqueEmail,
    waitForMail,
} from "./fixtures";

test("logowanie admina wymaga kodu z aplikacji", async ({ page, consoleErrors }) => {
    await page.goto("/logowanie");
    await page.getByLabel("E-mail").fill(ADMIN.email);
    await page.getByLabel("Hasło", { exact: true }).fill(ADMIN.password);
    await page.getByRole("button", { name: "Zaloguj się" }).click();

    await expect(page.getByLabel("Kod z aplikacji")).toBeVisible();
    await page.getByLabel("Kod z aplikacji").fill("000000");
    await page.getByRole("button", { name: "Potwierdź" }).click();
    await expect(page.getByRole("alert")).toContainText(/Nieprawidłowy kod/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/logowanie/);

    await login(page, ADMIN.email, ADMIN.password, ADMIN.totpSecret);
    await expect(page).toHaveURL(/\/admin/);
    void consoleErrors;
});

test("zmiana numeru konta wymaga hasła i kodu, a admini dostają alert", async ({ browser }) => {
    const admin = await adminPage(browser);
    await admin.goto("/admin/ustawienia?zakladka=oplaty");
    const account = admin.getByLabel(/Numer konta/);
    await account.fill("PL 98 7654 3210 9876 5432 1098 7654");

    // cancelling keeps the old number
    await admin.getByRole("button", { name: /Zapisz/ }).first().click();
    const dialog = admin.getByRole("dialog", { name: "Potwierdź operację" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Anuluj" }).click();
    await expect(admin.getByText(/Anulowano/)).toBeVisible();

    await admin.getByRole("button", { name: /Zapisz/ }).first().click();
    await confirmStepUp(admin);
    await expect(admin.getByText(/Zmiany zostały zapisane/)).toBeVisible();

    const alert = await waitForMail(ADMIN.email, /dane do przelewu/);
    expect(alert.text.replace(/\s/g, "")).toContain("98765432109876543210987654");

    // put the seeded account back for the other scenarios
    await account.fill("12345678901234567890123456");
    await admin.getByRole("button", { name: /Zapisz/ }).first().click();
    await confirmStepUp(admin);
    await expect(admin.getByText(/Zmiany zostały zapisane/)).toBeVisible();
    await admin.context().close();
});

test("nowy admin musi włączyć 2FA, zanim zobaczy panel", async ({ page, browser }) => {
    const email = uniqueEmail("nowyadmin");
    const password = "Nowy-admin-haslo-1";
    await register(page, email, password);

    const admin = await adminPage(browser);
    await admin.goto("/admin/uzytkownicy");
    await admin.getByLabel("Szukaj użytkownika").fill(email);
    await admin.getByRole("button", { name: `Akcje dla ${email}` }).click();
    await admin.getByRole("menuitem", { name: "Nadaj admina" }).click();
    await confirmStepUp(admin);
    await expect(admin.getByText("bez 2FA")).toBeVisible();
    await admin.context().close();

    await waitForMail(ADMIN.email, /nowy administrator/);

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Włącz logowanie dwuetapowe" })).toBeVisible();
    await page.getByLabel("Twoje hasło").fill(password);
    await page.getByRole("button", { name: "Dalej" }).click();

    await expect(page.getByRole("img", { name: /Kod QR/ })).toBeVisible();
    const secret = (await page.locator(".two-factor-secret").innerText()).trim();
    await page.getByLabel("Kod z aplikacji").fill(await totpCode(secret, email));
    await page.getByRole("button", { name: "Włącz logowanie dwuetapowe" }).click();

    const codes = page.getByRole("list", { name: "Kody zapasowe" }).getByRole("listitem");
    await expect(codes).toHaveCount(10);
    const recoveryCode = (await codes.first().innerText()).trim();
    await expect(page.getByRole("button", { name: "Gotowe" })).toBeDisabled();
    await page.getByText("Zapisałem kody w bezpiecznym miejscu").click();
    await page.getByRole("button", { name: "Gotowe" }).click();
    await expect(page.getByRole("heading", { name: "Włącz logowanie dwuetapowe" })).toHaveCount(0);
    await expect(page.getByRole("navigation").or(page.locator(".admin-sidenav")).first()).toBeVisible();

    // next login: password alone is not enough, a backup code works once
    await page.context().clearCookies();
    await page.goto("/logowanie");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Hasło", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Zaloguj się" }).click();
    await page.getByLabel("Kod z aplikacji").fill(recoveryCode);
    await page.getByRole("button", { name: "Potwierdź" }).click();
    await expect(page).toHaveURL(/\/admin/);
    await waitForMail(email, /kodem zapasowym/);
});

test("panel użytkowników: potwierdzenia w oknach, odebranie admina z hasłem i kodem", async ({ page, browser }) => {
    const email = uniqueEmail("potwierdzenia");
    await register(page, email);

    const admin = await adminPage(browser);
    // the old browser alert must be gone: any native dialog fails the test
    admin.on("dialog", (dialog) => {
        throw new Error(`natywne okno: ${dialog.message()}`);
    });
    await admin.goto("/admin/uzytkownicy");
    await admin.getByLabel("Szukaj użytkownika").fill(email);
    const menu = () => admin.getByRole("button", { name: `Akcje dla ${email}` });

    // block: cancel keeps the account active, confirm blocks it
    await menu().click();
    await admin.getByRole("menuitem", { name: "Zablokuj" }).click();
    const block = admin.getByRole("dialog", { name: "Zablokować konto?" });
    await expect(block).toContainText(email);
    await block.getByRole("button", { name: "Anuluj" }).click();
    await expect(block).toHaveCount(0);
    await expect(admin.getByText("zablokowany")).toHaveCount(0);

    await menu().click();
    await admin.getByRole("menuitem", { name: "Zablokuj" }).click();
    await admin.getByRole("dialog", { name: "Zablokować konto?" }).getByRole("button", { name: "Zablokuj" }).click();
    await expect(admin.getByText("zablokowany")).toBeVisible();
    await menu().click();
    await admin.getByRole("menuitem", { name: "Odblokuj" }).click();
    await expect(admin.getByText("zablokowany")).toHaveCount(0);

    // log out everywhere
    await menu().click();
    await admin.getByRole("menuitem", { name: "Wyloguj wszędzie" }).click();
    await admin.getByRole("dialog", { name: "Wylogować wszędzie?" }).getByRole("button", { name: "Wyloguj" }).click();
    await expect(admin.getByText(/Wylogowano .* ze wszystkich urządzeń/)).toBeVisible();

    // grant and take back admin: both need password + code
    await menu().click();
    await admin.getByRole("menuitem", { name: "Nadaj admina" }).click();
    await expect(admin.getByRole("dialog", { name: "Potwierdź operację" })).toContainText("Nadajesz uprawnienia administratora");
    await confirmStepUp(admin);
    await expect(admin.getByText("bez 2FA")).toBeVisible();

    await menu().click();
    await admin.getByRole("menuitem", { name: "Odbierz admina" }).click();
    await expect(admin.getByRole("dialog", { name: "Potwierdź operację" })).toContainText("Odbierasz uprawnienia administratora");
    await confirmStepUp(admin);
    await expect(admin.getByText("bez 2FA")).toHaveCount(0);
    await waitForMail(ADMIN.email, /odebrano uprawnienia/);
    await admin.context().close();
});

test("zwykły użytkownik nie widzi ustawień 2FA i loguje się samym hasłem", async ({ page }) => {
    const email = uniqueEmail("zwykly");
    await register(page, email);
    await page.goto("/ustawienia-konta");
    await expect(page.getByRole("heading", { name: "Logowanie dwuetapowe" })).toHaveCount(0);

    await page.context().clearCookies();
    await login(page, email, PASSWORD);
    await expect(page).toHaveURL(/panel/);
    expect((await mailsTo(email)).some((mail) => /alert/.test(mail.subject))).toBe(false);
});
