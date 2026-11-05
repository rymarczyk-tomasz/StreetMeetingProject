import { test as base, expect, type Page, type Browser } from "@playwright/test";
import config from "../config.cjs";

const { MAIL_PORT, ADMIN } = config;
export { ADMIN };

export const PASSWORD = "Haslo-e2e-123";

// 1x1 PNG, enough for the backend's magic-byte check and sharp
export const PNG = {
    name: "auto.png",
    mimeType: "image/png",
    buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
        "base64",
    ),
};

let ipCounter = 0;
// every browser context gets its own client ip, so the per-ip login limiter
// (10/min) doesn't trip over a whole suite of logins from localhost
function nextIp() {
    ipCounter += 1;
    return `10.77.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
}

export const test = base.extend<{ consoleErrors: string[] }>({
    extraHTTPHeaders: async ({}, use) => {
        await use({ "X-Forwarded-For": `${nextIp()}` });
    },
    // fail on uncaught errors in the page, not just on broken assertions
    consoleErrors: async ({ page }, use) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await use(errors);
        expect(errors, "błędy JavaScript na stronie").toEqual([]);
    },
});
export { expect };

export function uniqueEmail(prefix = "user") {
    return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

type Mail = { to: string; subject: string; text: string; html: string };

export async function mailsTo(address: string): Promise<Mail[]> {
    const res = await fetch(`http://localhost:${MAIL_PORT}/mails?to=${encodeURIComponent(address)}`);
    return res.json();
}

export async function waitForMail(address: string, subject: RegExp): Promise<Mail> {
    let found: Mail | undefined;
    await expect
        .poll(
            async () => {
                found = (await mailsTo(address)).find((mail) => subject.test(mail.subject));
                return Boolean(found);
            },
            { message: `mail "${subject}" do ${address}`, timeout: 10_000 },
        )
        .toBe(true);
    return found!;
}

// links in e-mails point at APP_URL (the e2e frontend), so they can be opened as-is
export function linkFrom(mail: Mail, path: string) {
    const match = mail.text.match(new RegExp(`https?://[^\\s]*${path}[^\\s]*`));
    expect(match, `link ${path} w mailu "${mail.subject}"`).toBeTruthy();
    return match![0];
}

export async function login(page: Page, email: string, password = PASSWORD) {
    await page.goto("/logowanie");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Hasło", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Zaloguj się" }).click();
    await expect(page).not.toHaveURL(/logowanie/);
}

export async function register(page: Page, email: string, password = PASSWORD) {
    await page.goto("/rejestracja");
    await page.getByLabel("Imię").fill("Jan");
    await page.getByLabel("Nazwisko").fill("Testowy");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Hasło", { exact: true }).fill(password);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Zarejestruj się" }).click();
    await expect(page).toHaveURL(/\/panel/);
}

// registered and confirmed through the real e-mail link
export async function registerVerified(page: Page, email: string) {
    await register(page, email);
    const mail = await waitForMail(email, /potwierdź adres e-mail/);
    await page.goto(linkFrom(mail, "/potwierdz-email"));
    await expect(page.getByText(/potwierdzony/i).first()).toBeVisible();
}

export async function adminPage(browser: Browser) {
    const context = await browser.newContext({ extraHTTPHeaders: { "X-Forwarded-For": nextIp() } });
    const page = await context.newPage();
    await login(page, ADMIN.email, ADMIN.password);
    return page;
}

export async function submitCar(page: Page, { brand, plate }: { brand: string; plate: string }) {
    await page.goto("/formularz");
    await page.getByLabel("Marka pojazdu").fill(brand);
    await page.getByLabel("Numer tablic").fill(plate);
    await page.getByLabel("Opis pojazdu").fill("Auto testowe, przeklikane przez Playwright.");
    await page.getByLabel("Imię").fill("Jan");
    await page.getByLabel("Nazwisko").fill("Testowy");
    await page.getByLabel("Telefon").fill("500600700");
    await page.locator('input[type="file"]').setInputFiles(PNG);
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
    await expect(page.getByRole("heading", { name: "Zgłoszenie wysłane" })).toBeVisible();
}
