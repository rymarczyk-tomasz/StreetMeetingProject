// Backend for e2e: built app from backend/dist, a throwaway data dir, fake SMTP.
// Sent e-mails are exposed on MAIL_PORT: GET /mails (?to=address).
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const { API_PORT, MAIL_PORT, FRONT_PORT, ADMIN } = require("./config.cjs");

const backendDir = path.resolve(__dirname, "../backend");
const fromBackend = (name) => require(require.resolve(name, { paths: [backendDir] }));

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "streetshow-e2e-"));
process.chdir(dataDir);

Object.assign(process.env, {
    NODE_ENV: "test",
    JWT_ACCESS_SECRET: "e2e-access-secret",
    JWT_REFRESH_SECRET: "e2e-refresh-secret",
    SMTP_HOST: "smtp.e2e",
    SMTP_USER: "e2e",
    SMTP_PASSWORD: "e2e",
    SMTP_FROM: "Street Show <no-reply@streetshow.test>",
    ADMIN_NOTIFY_EMAIL: "org@streetshow.test",
    APP_URL: `http://localhost:${FRONT_PORT}`,
    CORS_ORIGINS: `http://localhost:${FRONT_PORT}`,
});

const mails = [];
fromBackend("nodemailer").createTransport = () => ({
    sendMail: async (message) => {
        mails.push({ to: message.to, subject: message.subject, text: message.text, html: message.html });
        return { messageId: String(mails.length) };
    },
});

const app = require(path.join(backendDir, "dist/app.js"));
const usersDb = require(path.join(backendDir, "dist/src/db/users.js"));
const siteContentDb = require(path.join(backendDir, "dist/src/db/siteContent.js"));
const bcrypt = fromBackend("bcryptjs");

const admin = usersDb.createUser({
    email: ADMIN.email,
    passwordHash: bcrypt.hashSync(ADMIN.password, 4),
    firstName: "Admin",
    lastName: "Testowy",
    role: "admin",
    termsVersion: "default",
});
usersDb.setEmailVerified(admin.id);

siteContentDb.saveContent("settings", {
    ...siteContentDb.getSettings(),
    selectFeeAmount: "150 zł",
    paymentRecipient: "Street Show Sp. z o.o.",
    paymentAccount: "12345678901234567890123456",
});
siteContentDb.saveContent("partners", {
    enabled: true,
    title: "Partnerzy",
    items: [{ id: "p1", tier: "main", name: "Partner Testowy", logo: "/img/logo-street-show-black.png", url: "" }],
});

app.listen(API_PORT, () => console.log(`e2e api on ${API_PORT}, data in ${dataDir}`));

http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname !== "/mails") {
        res.writeHead(404).end();
        return;
    }
    const to = url.searchParams.get("to");
    const list = to
        ? mails.filter((mail) => String(mail.to).split(",").map((a) => a.trim()).includes(to))
        : mails;
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(list));
}).listen(MAIL_PORT);

process.on("exit", () => {
    try {
        fs.rmSync(dataDir, { recursive: true, force: true });
    } catch {
        // sqlite may still hold the file on windows; it's in the os temp dir
    }
});
