// Each test file runs in its own process (node --test), so every file gets a
// fresh temp dir with its own sqlite db and uploads - never the real data/.
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "streetshow-test-"));
process.chdir(tmpDir);

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
// fake SMTP: every e-mail lands in `mails` instead of leaving the machine
process.env.SMTP_HOST = "smtp.test";
process.env.SMTP_USER = "test";
process.env.SMTP_PASSWORD = "test";
process.env.SMTP_FROM = "Street Show <no-reply@streetshow.test>";
process.env.ADMIN_NOTIFY_EMAIL = "org@streetshow.test";
process.env.APP_URL = "https://streetshow.test";
delete process.env.SMTP_REPLY_TO;

const mails = [];
const nodemailer = require("nodemailer");
nodemailer.createTransport = () => ({
    sendMail: async (message) => {
        mails.push(message);
        return { messageId: String(mails.length) };
    },
});

const bcrypt = require("bcryptjs");
const request = require("supertest");
const app = require("../app");
const db = require("../src/db/database");
const usersDb = require("../src/db/users");
const submissionsDb = require("../src/db/submissions");
const siteContentDb = require("../src/db/siteContent");
const { signAccessToken } = require("../src/auth/tokens");

process.on("exit", () => {
    try {
        db.close();
        fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
        // windows may still hold the file; it's in the os temp dir anyway
    }
});

const PASSWORD = "Haslo-testowe-123";
const passwordHash = bcrypt.hashSync(PASSWORD, 4);

let counter = 0;
const nextId = () => ++counter;

// a distinct client ip per request, so the per-ip rate limiters stay out of the way
function freshIp() {
    const n = nextId();
    return `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`;
}

function mailsTo(address) {
    return mails.filter((mail) => String(mail.to).split(",").map((a) => a.trim()).includes(address));
}

function createUser({ role = "user", gateStaff = false, email = undefined, verified = true } = {}) {
    const user = usersDb.createUser({
        email: email || `user${nextId()}@example.com`,
        passwordHash,
        firstName: "Jan",
        lastName: "Kowalski",
        role,
        termsVersion: "default",
    });
    if (gateStaff) usersDb.updateUserGateStaff(user.id, true);
    if (verified) usersDb.setEmailVerified(user.id);
    return usersDb.findUserById(user.id);
}

// supertest wrapper that sends the user's session cookie (or none)
function api(user = null, { ip = freshIp() } = {}) {
    const cookie = user ? `access_token=${signAccessToken(user)}` : null;
    const wrap = (method) => (url) => {
        const req = request(app)[method](url).set("X-Forwarded-For", ip);
        return cookie ? req.set("Cookie", cookie) : req;
    };
    return {
        get: wrap("get"),
        post: wrap("post"),
        patch: wrap("patch"),
        put: wrap("put"),
        delete: wrap("delete"),
    };
}

function createSubmission(user, overrides: any = {}) {
    const { status, paymentStatus, ...fields } = overrides;
    let row = submissionsDb.createSubmission({
        userId: user.id,
        firstName: "Jan",
        lastName: "Kowalski",
        phone: "500600700",
        licensePlate: `GD ${10000 + nextId()}`,
        carBrand: "BMW E46",
        carDescription: "Opis auta",
        photos: [],
        edition: siteContentDb.getCurrentEdition(),
        consentVersion: "default",
        photoPublishConsent: false,
        ...fields,
    });
    if (status) row = submissionsDb.updateSubmissionStatus(row.id, status, "");
    if (paymentStatus) row = submissionsDb.updateSubmissionPaymentStatus(row.id, paymentStatus);
    return row;
}

function saveSettings(patch) {
    siteContentDb.saveContent("settings", { ...siteContentDb.getSettings(), ...patch });
}

module.exports = {
    app,
    db,
    api,
    createUser,
    createSubmission,
    saveSettings,
    freshIp,
    PASSWORD,
    mails,
    mailsTo,
    submissionsDb,
    usersDb,
};
