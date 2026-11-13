const { api, createUser, createSubmission, submissionsDb } = require("./helpers");
const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const siteContentDb = require("../src/db/siteContent");
const auditLogDb = require("../src/db/auditLog");
const { purgeDueSubmissionFiles, purgeDateOf } = require("../src/retention");
const { getUserSubmissionsDir, SHOWCASE_UPLOAD_ROOT } = require("../src/utils/paths");

function setEdition(year, date) {
    siteContentDb.saveContent("edition", { ...siteContentDb.getContent("edition"), year, date });
}

// a submission with one photo and a proof really on disk
function withFiles(user, overrides = {}) {
    const dir = getUserSubmissionsDir(user.id);
    fs.mkdirSync(dir, { recursive: true });
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const photo = `${stamp}.jpg`;
    const proof = `proof-${stamp}.pdf`;
    fs.writeFileSync(path.join(dir, photo), Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    fs.writeFileSync(path.join(dir, proof), "%PDF-1.4");
    const row = createSubmission(user, {
        photos: [`/uploads/submissions/${user.id}/${photo}`],
        ...overrides,
    });
    submissionsDb.setPaymentProof(row.id, `/uploads/submissions/${user.id}/${proof}`);
    return {
        row: submissionsDb.findSubmissionById(row.id),
        photoPath: path.join(dir, photo),
        proofPath: path.join(dir, proof),
    };
}

describe("termin usunięcia zdjęć", () => {
    beforeEach(() => setEdition(2027, "2027-06-13"));

    test("przyjęte: 12 miesięcy po wydarzeniu, pozostałe: 30 dni", () => {
        const user = createUser();
        const approved = createSubmission(user, { status: "approved" });
        const rejected = createSubmission(user, { status: "rejected" });
        const pending = createSubmission(user);
        assert.equal(purgeDateOf(approved), "2028-06-13");
        assert.equal(purgeDateOf(rejected), "2027-07-13");
        assert.equal(purgeDateOf(pending), "2027-07-13");
    });

    test("data edycji zostaje zapamiętana po przełączeniu na kolejny rok", () => {
        const user = createUser();
        const old = createSubmission(user, { status: "approved" });
        setEdition(2028, "");
        assert.equal(siteContentDb.getEditionDate(2027), "2027-06-13");
        assert.equal(purgeDateOf(old), "2028-06-13");
    });

    test("bieżąca edycja bez daty nie jest ruszana, miniony rok bez daty liczy się od końca roku", () => {
        const user = createUser();
        setEdition(2027, "");
        assert.equal(purgeDateOf(createSubmission(user), "2027-09-01"), null);
        const past = createSubmission(user, { edition: 2025, status: "approved" });
        assert.equal(purgeDateOf(past, "2027-01-01"), "2026-12-31");
    });
});

describe("czyszczenie plików po wydarzeniu", () => {
    beforeEach(() => setEdition(2027, "2027-06-13"));

    test("usuwa zdjęcia, kopie na stronę aut i potwierdzenie, a resztę zgłoszenia zostawia", async () => {
        const user = createUser();
        const due = withFiles(user, { status: "rejected" });
        const later = withFiles(user, { status: "approved" });
        fs.mkdirSync(SHOWCASE_UPLOAD_ROOT, { recursive: true });
        const showcaseCopy = path.join(SHOWCASE_UPLOAD_ROOT, `${due.row.id}-abc-480.webp`);
        fs.writeFileSync(showcaseCopy, "x");

        assert.deepEqual(purgeDueSubmissionFiles("2027-07-12"), []);
        assert.deepEqual(purgeDueSubmissionFiles("2027-07-13"), [due.row.id]);
        await new Promise((resolve) => setTimeout(resolve, 50));

        assert.ok(!fs.existsSync(due.photoPath));
        assert.ok(!fs.existsSync(due.proofPath));
        assert.ok(!fs.existsSync(showcaseCopy));
        assert.ok(fs.existsSync(later.photoPath));
        assert.ok(fs.existsSync(later.proofPath));

        const purged = submissionsDb.findSubmissionById(due.row.id);
        assert.equal(purged.photos, "[]");
        assert.equal(purged.payment_proof, null);
        assert.ok(purged.files_purged_at);
        assert.equal(purged.license_plate, due.row.license_plate);
        assert.equal(purged.status, "rejected");

        const entry = auditLogDb.listAuditEntries(5).find((row) => row.action === "submission.files_purged");
        assert.ok(entry);
        assert.equal(JSON.parse(entry.details).count, 1);

        // second run: nothing left to do
        assert.deepEqual(purgeDueSubmissionFiles("2027-07-13"), []);

        // the participant sees why the photos are gone
        const res = await api(user).get("/api/submissions");
        const shown = res.body.submissions.find((item) => item.id === due.row.id);
        assert.deepEqual(shown.photos, []);
        assert.equal(shown.paymentProofUrl, null);
        assert.ok(shown.filesPurgedAt);
    });

    test("przyjęte zgłoszenie traci pliki dopiero rok po wydarzeniu", async () => {
        const user = createUser();
        const paid = withFiles(user, { status: "approved", paymentStatus: "paid" });
        assert.ok(!purgeDueSubmissionFiles("2028-06-12").includes(paid.row.id));
        assert.ok(purgeDueSubmissionFiles("2028-06-13").includes(paid.row.id));
        await new Promise((resolve) => setTimeout(resolve, 50));
        assert.ok(!fs.existsSync(paid.photoPath));
        assert.ok(!fs.existsSync(paid.proofPath));
    });
});
