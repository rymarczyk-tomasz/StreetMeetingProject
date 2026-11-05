// The whole life of one submission, clicked through by a participant and an admin.
import {
    test,
    expect,
    adminPage,
    login,
    linkFrom,
    PNG,
    register,
    submitCar,
    uniqueEmail,
    waitForMail,
} from "./fixtures";

test.describe.configure({ mode: "serial" });

const email = uniqueEmail("uczestnik");
const plate = `GD ${Math.floor(10000 + Math.random() * 89999)}`;
let passCode = "";

async function openSubmissionAsAdmin(page) {
    await page.goto("/admin/zgloszenia");
    await page.getByRole("button", { name: /Skoda/ }).first().click();
}

test("rejestracja: bez potwierdzenia e-maila formularz jest zablokowany", async ({ page, consoleErrors }) => {
    await register(page, email);
    await expect(page.getByText(/Potwierdź swój adres e-mail/)).toBeVisible();

    await page.goto("/formularz");
    await expect(page.getByText(/Potwierdź swój adres e-mail/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Wyślij zgłoszenie" })).toHaveCount(0);
    void consoleErrors;
});

test("link z maila potwierdza adres i odblokowuje formularz", async ({ page }) => {
    const mail = await waitForMail(email, /potwierdź adres e-mail/);
    await login(page, email);
    await page.goto(linkFrom(mail, "/potwierdz-email"));
    await expect(page.getByText(/potwierdzony/i).first()).toBeVisible();

    await page.goto("/panel");
    await expect(page.getByText(/Potwierdź swój adres e-mail/)).toHaveCount(0);
});

test("uczestnik zgłasza auto, organizator dostaje maila", async ({ page, consoleErrors }) => {
    await login(page, email);
    await submitCar(page, { brand: "Skoda Fabia", plate });

    const mail = await waitForMail("org@streetshow.test", new RegExp(plate));
    expect(mail.subject).toMatch(/nowe zgłoszenie/);

    await page.goto("/panel");
    await expect(page.getByText("Skoda Fabia").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Edytuj dane" })).toBeVisible();
    void consoleErrors;
});

test("admin prosi o lepsze zdjęcia, a uczestnik może poprawić zgłoszenie", async ({ page, browser }) => {
    const admin = await adminPage(browser);
    await openSubmissionAsAdmin(admin);
    await admin.getByLabel("Komentarz dla uczestnika").fill("Prosimy o zdjęcie auta z tyłu.");
    await admin.getByRole("button", { name: "Poproś o poprawki" }).click();
    await admin.context().close();

    const mail = await waitForMail(email, /uzupełnienie zgłoszenia/);
    expect(mail.text).toContain("Prosimy o zdjęcie auta z tyłu.");

    await login(page, email);
    await page.goto(linkFrom(mail, "/panel"));
    await expect(page.getByText("Prosimy o zdjęcie auta z tyłu.")).toBeVisible();
    await page.getByRole("button", { name: "Edytuj dane" }).click();
    await page.getByLabel("Marka pojazdu").fill("Skoda Octavia RS");
    await page.getByRole("button", { name: "Zapisz zmiany" }).click();
    await expect(page.getByText("Skoda Octavia RS").first()).toBeVisible();
});

test("akceptacja: uczestnik dostaje maila i widzi dane do przelewu", async ({ page, browser }) => {
    const admin = await adminPage(browser);
    await openSubmissionAsAdmin(admin);
    await admin.getByRole("button", { name: "Zaakceptuj" }).click();
    await expect(admin.getByText(/Zaakceptowane/i).first()).toBeVisible();
    await admin.context().close();

    const mail = await waitForMail(email, /zaakceptowane/);
    expect(mail.text).toContain("150 zł");

    await login(page, email);
    await page.goto("/panel");
    await expect(page.getByText("150 zł", { exact: true })).toBeVisible();
    await expect(page.getByText("12 3456 7890 1234 5678 9012 3456", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edytuj dane" })).toHaveCount(0);
});

test("uczestnik wgrywa potwierdzenie przelewu", async ({ page }) => {
    await login(page, email);
    await page.goto("/panel");
    await page.locator('.payment-actions input[type="file"]').setInputFiles({ ...PNG, name: "przelew.png" });
    await expect(page.getByRole("link", { name: "Twoje potwierdzenie przelewu" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pokaż wejściówkę" })).toHaveCount(0);

    await waitForMail("org@streetshow.test", /przelew|opłat/i);
});

test("admin potwierdza opłatę, uczestnik dostaje wejściówkę z kodem QR", async ({ page, browser }) => {
    const admin = await adminPage(browser);
    await openSubmissionAsAdmin(admin);
    await admin.getByRole("tab", { name: "Opłata" }).click();
    await admin.getByRole("button", { name: "Potwierdź opłatę i wyślij wejściówkę" }).click();
    await expect(admin.getByRole("button", { name: "Oznacz jako nieopłacone" })).toBeVisible();
    await admin.context().close();

    await waitForMail(email, /opłat/i);

    await login(page, email);
    await page.goto("/panel");
    await page.getByRole("button", { name: "Pokaż wejściówkę" }).click();
    await expect(page.getByRole("img", { name: /Kod QR wejściówki/ })).toBeVisible();
    const alt = await page.getByRole("img", { name: /Kod QR wejściówki/ }).getAttribute("alt");
    passCode = alt!.match(/SSP-[A-Z0-9]{4}-[A-Z0-9]{4}/)![0];
});

test("z opłaconym miejscem nie da się usunąć konta", async ({ page }) => {
    await login(page, email);
    await page.goto("/ustawienia-konta");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByLabel("Potwierdź hasłem").fill("Haslo-e2e-123");
    await page.getByRole("button", { name: "Usuń konto" }).click();
    await expect(page.getByText(/Masz opłacone miejsce/)).toBeVisible();

    await page.goto("/panel");
    await expect(page).toHaveURL(/panel/);
});

test("bramka: kod z wejściówki wpuszcza auto tylko raz", async ({ browser }) => {
    expect(passCode).toMatch(/^SSP-/);
    const admin = await adminPage(browser);
    await admin.goto("/wjazd");

    await admin.getByLabel("Kod z wejściówki").fill(passCode.toLowerCase());
    await admin.getByRole("button", { name: "Sprawdź" }).click();
    await expect(admin.getByText(plate.replace(" ", "")).or(admin.getByText(plate)).first()).toBeVisible();
    await admin.getByRole("button", { name: "Zarejestruj wjazd" }).click();
    await expect(admin.getByRole("button", { name: "Cofnij wjazd (pomyłka)" }).first()).toBeVisible();

    await admin.getByRole("button", { name: "Skanuj kolejny" }).click();
    await admin.getByLabel("Kod z wejściówki").fill(passCode);
    await admin.getByRole("button", { name: "Sprawdź" }).click();
    await expect(admin.getByRole("button", { name: "Zarejestruj wjazd" })).toHaveCount(0);
    await admin.context().close();
});

test("zwykły uczestnik nie wejdzie do panelu admina ani na bramkę", async ({ page }) => {
    await login(page, email);
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin/);
    await page.goto("/wjazd");
    await expect(page.getByRole("heading", { name: "Brak uprawnień" })).toBeVisible();
    await expect(page.getByLabel("Kod z wejściówki")).toHaveCount(0);
});

test("nieznany kod na bramce", async ({ browser }) => {
    const admin = await adminPage(browser);
    await admin.goto("/wjazd");
    await admin.getByLabel("Kod z wejściówki").fill("SSP-ZZZZ-ZZZZ");
    await admin.getByRole("button", { name: "Sprawdź" }).click();
    await expect(admin.getByText(/Nieprawidłowy kod|Nieznany kod/)).toBeVisible();
    await admin.context().close();
});

test("rejestracja na zajęty adres pokazuje błąd", async ({ page }) => {
    await page.goto("/rejestracja");
    await page.getByLabel("Imię").fill("Jan");
    await page.getByLabel("Nazwisko").fill("Drugi");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Hasło", { exact: true }).fill("Haslo-e2e-123");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Zarejestruj się" }).click();
    await expect(page.getByText(/już istnieje/)).toBeVisible();
});
