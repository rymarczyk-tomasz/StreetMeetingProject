import {
    test,
    expect,
    adminPage,
    login,
    linkFrom,
    PASSWORD,
    register,
    uniqueEmail,
    waitForMail,
    mailsTo,
} from "./fixtures";

test("reset hasła: mail z linkiem, nowe hasło, ostrzeżenie o zmianie", async ({ page, consoleErrors }) => {
    const email = uniqueEmail("reset");
    await register(page, email);
    await page.context().clearCookies();

    await page.goto("/logowanie");
    await page.getByRole("link", { name: "Nie pamiętasz hasła?" }).click();
    await expect(page.getByRole("heading", { name: "Nie pamiętasz hasła?" })).toBeVisible();
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: "Wyślij link" }).click();
    await expect(page.getByRole("status")).toBeVisible();

    const resetMail = await waitForMail(email, /hasł/i);
    await page.goto(linkFrom(resetMail, "/reset-hasla"));
    await page.getByLabel("Nowe hasło", { exact: true }).fill("Odzyskane-456");
    await page.getByLabel("Powtórz nowe hasło").fill("Odzyskane-456");
    await page.getByRole("button", { name: "Ustaw hasło" }).click();
    await expect(page.getByRole("status")).toBeVisible();

    const warning = await waitForMail(email, /hasło zostało zmienione/);
    expect(warning.text).toContain("/nie-pamietam-hasla");

    // the same link can't be used twice
    await page.goto(linkFrom(resetMail, "/reset-hasla"));
    await page.getByLabel("Nowe hasło", { exact: true }).fill("Inne-haslo-789");
    await page.getByLabel("Powtórz nowe hasło").fill("Inne-haslo-789");
    await page.getByRole("button", { name: "Ustaw hasło" }).click();
    await expect(page.getByRole("alert")).toContainText(/nieprawidłowy lub wygasł/);

    await login(page, email, "Odzyskane-456");
    await expect(page).toHaveURL(/panel/);
    void consoleErrors;
});

test("zmiana hasła w ustawieniach wysyła ostrzeżenie", async ({ page }) => {
    const email = uniqueEmail("zmiana");
    await register(page, email);
    await page.goto("/ustawienia-konta");
    const form = page.locator("form", { has: page.getByRole("button", { name: "Zmień hasło" }) });
    await form.getByLabel("Aktualne hasło").fill(PASSWORD);
    await form.getByLabel("Nowe hasło", { exact: true }).fill("Nowe-haslo-456");
    await form.getByLabel("Powtórz nowe hasło").fill("Nowe-haslo-456");
    await form.getByRole("button", { name: "Zmień hasło" }).click();
    await expect(page.getByRole("status")).toContainText(/zmienione/);

    const mail = await waitForMail(email, /hasło zostało zmienione/);
    expect(mail.html).toContain("Jeśli to nie Ty");
});

test("złe hasło przy logowaniu pokazuje błąd", async ({ page }) => {
    const email = uniqueEmail("zle");
    await register(page, email);
    await page.context().clearCookies();
    await page.goto("/logowanie");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Hasło", { exact: true }).fill("zupelnie-zle-haslo");
    await page.getByRole("button", { name: "Zaloguj się" }).click();
    await expect(page.getByRole("alert")).toContainText(/Nieprawidłowy e-mail lub hasło/);
});

test("usunięcie konta bez opłaconego miejsca: wylogowanie i mail z potwierdzeniem", async ({ page }) => {
    const email = uniqueEmail("usun");
    await register(page, email);
    await page.goto("/ustawienia-konta");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByLabel("Potwierdź hasłem").fill(PASSWORD);
    await page.getByRole("button", { name: "Usuń konto" }).click();
    await expect(page).toHaveURL("/");

    const mail = await waitForMail(email, /konto zostało usunięte/);
    expect(mail.text).toContain(email);

    await page.goto("/panel");
    await expect(page).toHaveURL(/logowanie/);
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Hasło", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Zaloguj się" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
});

test("anulowanie okna potwierdzenia nie usuwa konta", async ({ page }) => {
    const email = uniqueEmail("anuluj");
    await register(page, email);
    await page.goto("/ustawienia-konta");
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByLabel("Potwierdź hasłem").fill(PASSWORD);
    await page.getByRole("button", { name: "Usuń konto" }).click();
    await page.goto("/panel");
    await expect(page).toHaveURL(/panel/);
    expect((await mailsTo(email)).some((mail) => /usunięte/.test(mail.subject))).toBe(false);
});

test("admin ukrywa i przywraca sekcję partnerów", async ({ page, browser }) => {
    await page.goto("/");
    await expect(page.locator("#partners")).toBeVisible();
    await expect(page.getByRole("img", { name: /Partner Testowy/ }).or(page.getByText("Partner Testowy")).first()).toBeVisible();

    const admin = await adminPage(browser);
    await admin.goto("/admin/tresci?zakladka=partners");
    const toggle = admin.getByLabel("Pokazuj sekcję na stronie głównej");
    await toggle.uncheck();
    await expect(admin.getByText(/Sekcja jest ukryta/)).toBeVisible();
    await admin.getByRole("button", { name: "Zapisz partnerów" }).click();
    await expect(admin.getByRole("status").or(admin.getByText(/Zapisano/)).first()).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: /Street Show/i }).first()).toBeVisible();
    await expect(page.locator("#partners")).toHaveCount(0);

    await admin.reload();
    await expect(admin.getByLabel("Pokazuj sekcję na stronie głównej")).not.toBeChecked();
    await admin.getByLabel("Pokazuj sekcję na stronie głównej").check();
    await admin.getByRole("button", { name: "Zapisz partnerów" }).click();
    await admin.context().close();

    await expect
        .poll(async () => {
            await page.reload();
            return page.locator("#partners").count();
        })
        .toBe(1);
});
