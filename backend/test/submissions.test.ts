const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const sharp = require("sharp");
const { api, createUser, createSubmission, saveSettings, submissionsDb, usersDb, db } = require("./helpers");
const { getUserSubmissionsDir } = require("../src/utils/paths");

const pngBuffer = () =>
    sharp({ create: { width: 8, height: 8, channels: 3, background: "#c00" } }).png().toBuffer();

function auditActions(submissionId) {
    return db
        .prepare("SELECT action FROM audit_log WHERE target_id = ? ORDER BY id")
        .all(submissionId)
        .map((row) => row.action);
}

describe("dostęp do cudzych zgłoszeń", () => {
    test("lista pokazuje tylko własne zgłoszenia", async () => {
        const alice = createUser();
        const bob = createUser();
        const own = createSubmission(alice);
        createSubmission(bob);

        const res = await api(alice).get("/api/submissions");
        assert.equal(res.status, 200);
        assert.deepEqual(res.body.submissions.map((s) => s.id), [own.id]);
    });

    test("cudze zgłoszenie wygląda jak nieistniejące", async () => {
        const alice = createUser();
        const bob = createUser();
        const bobs = createSubmission(bob, { status: "approved", paymentStatus: "paid" });
        const client = api(alice);

        for (const [method, url, body] of [
            ["patch", `/api/submissions/${bobs.id}`, { carBrand: "Hack" }],
            ["delete", `/api/submissions/${bobs.id}`],
            ["patch", `/api/submissions/${bobs.id}/payment-status`, {}],
            ["post", `/api/submissions/${bobs.id}/withdraw`, {}],
            ["get", `/api/submissions/${bobs.id}/pass`],
            ["get", `/api/submissions/${bobs.id}/messages`],
        ]) {
            const res = await client[method](url).send(body);
            assert.equal(res.status, 404, `${method} ${url}`);
        }
        assert.equal(submissionsDb.findSubmissionById(bobs.id).status, "approved");
    });

    test("nie da się pobrać cudzego potwierdzenia przelewu", async () => {
        const alice = createUser();
        const bob = createUser();
        const res = await api(alice).get(`/api/submissions/proofs/${bob.id}/proof-1-abc.png`);
        assert.equal(res.status, 404);
    });

    test("niezalogowany nie ma dostępu", async () => {
        assert.equal((await api().get("/api/submissions")).status, 401);
    });
});

describe("edycja zgłoszenia", () => {
    test("po decyzji organizatora nie można edytować ani usunąć", async () => {
        const user = createUser();
        const client = api(user);
        for (const status of ["approved", "rejected", "waitlist"]) {
            const row = createSubmission(user, { status });
            assert.equal((await client.patch(`/api/submissions/${row.id}`).send({})).status, 400);
            assert.equal((await client.delete(`/api/submissions/${row.id}`)).status, 400);
        }
    });

    test("oczekujące można wycofać", async () => {
        const user = createUser();
        const row = createSubmission(user);
        const res = await api(user).delete(`/api/submissions/${row.id}`);
        assert.equal(res.status, 200);
        assert.equal(submissionsDb.findSubmissionById(row.id), undefined);
    });

    test("rezygnacja z zaakceptowanego zostawia historię, ale nie po wjeździe", async () => {
        const user = createUser();
        const row = createSubmission(user, { status: "approved", paymentStatus: "paid" });
        const res = await api(user).post(`/api/submissions/${row.id}/withdraw`);
        assert.equal(res.status, 200);
        assert.equal(submissionsDb.findSubmissionById(row.id).status, "withdrawn");

        const checkedIn = createSubmission(user, { status: "approved", paymentStatus: "paid" });
        submissionsDb.setCheckedIn(checkedIn.id, true);
        assert.equal((await api(user).post(`/api/submissions/${checkedIn.id}/withdraw`)).status, 400);
    });
});

describe("zgłoszenie opłaty przez uczestnika", () => {
    test("przed akceptacją nie można zgłosić opłaty ani dodać potwierdzenia", async () => {
        const user = createUser();
        const client = api(user);
        for (const status of ["pending", "waitlist", "rejected"]) {
            const row = createSubmission(user, { status });
            assert.equal((await client.patch(`/api/submissions/${row.id}/payment-status`)).status, 400);
            const upload = await client
                .post(`/api/submissions/${row.id}/payment-proof`)
                .attach("proof", await pngBuffer(), "przelew.png");
            assert.equal(upload.status, 400);
        }
    });

    test("kliknięcie „zapłacono” daje weryfikację, nie opłacone", async () => {
        const user = createUser();
        const row = createSubmission(user, { status: "approved" });
        const res = await api(user).patch(`/api/submissions/${row.id}/payment-status`).send({ paymentStatus: "paid" });
        assert.equal(res.status, 200);
        assert.equal(res.body.submission.paymentStatus, "verification");
        assert.equal(res.body.submission.hasPass, false);
    });

    test("potwierdzonej opłaty nie można zgłosić ponownie ani podmienić potwierdzenia", async () => {
        const user = createUser();
        const row = createSubmission(user, { status: "approved", paymentStatus: "paid" });
        const client = api(user);
        assert.equal((await client.patch(`/api/submissions/${row.id}/payment-status`)).status, 400);
        const upload = await client
            .post(`/api/submissions/${row.id}/payment-proof`)
            .attach("proof", await pngBuffer(), "przelew.png");
        assert.equal(upload.status, 400);
        assert.equal(submissionsDb.findSubmissionById(row.id).payment_status, "paid");
    });

    test("potwierdzenie przelewu ustawia weryfikację, a nowe zastępuje stare", async () => {
        const user = createUser();
        const row = createSubmission(user, { status: "approved" });
        const client = api(user);

        const first = await client
            .post(`/api/submissions/${row.id}/payment-proof`)
            .attach("proof", await pngBuffer(), "przelew.png");
        assert.equal(first.status, 200);
        assert.equal(first.body.submission.paymentStatus, "verification");
        const firstFile = submissionsDb.findSubmissionById(row.id).payment_proof;

        const second = await client
            .post(`/api/submissions/${row.id}/payment-proof`)
            .attach("proof", await pngBuffer(), "przelew2.png");
        assert.equal(second.status, 200);

        const files = fs.readdirSync(getUserSubmissionsDir(user.id));
        assert.equal(files.length, 1);
        assert.ok(!firstFile.endsWith(files[0]));

        const own = await client.get(second.body.submission.paymentProofUrl.replace(/^.*\/api/, "/api"));
        assert.equal(own.status, 200);
    });

    test("odrzuca brak pliku, zły typ i plik udający obrazek", async () => {
        const user = createUser();
        const row = createSubmission(user, { status: "approved" });
        const client = api(user);
        const url = `/api/submissions/${row.id}/payment-proof`;

        assert.equal((await client.post(url).field("x", "1")).status, 400);
        assert.equal(
            (await client.post(url).attach("proof", Buffer.from("hello"), { filename: "a.txt", contentType: "text/plain" })).status,
            400,
        );
        assert.equal(
            (await client.post(url).attach("proof", Buffer.from("to nie png"), { filename: "a.png", contentType: "image/png" })).status,
            400,
        );
        assert.equal(submissionsDb.findSubmissionById(row.id).payment_status, "unpaid");
    });
});

describe("weryfikacja opłaty przez admina", () => {
    test("zwykły użytkownik nie może sam oznaczyć opłaty jako potwierdzonej", async () => {
        const user = createUser();
        const row = createSubmission(user, { status: "approved", paymentStatus: "verification" });
        const res = await api(user)
            .patch(`/api/admin/submissions/${row.id}/payment-status`)
            .send({ paymentStatus: "paid" });
        assert.equal(res.status, 403);
        assert.equal(submissionsDb.findSubmissionById(row.id).payment_status, "verification");
    });

    test("admin potwierdza opłatę, zmiana trafia do dziennika i odblokowuje przepustkę", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const row = createSubmission(user, { status: "approved", paymentStatus: "verification" });

        const before = await api(user).get(`/api/submissions/${row.id}/pass`);
        assert.equal(before.status, 400);

        const res = await api(admin)
            .patch(`/api/admin/submissions/${row.id}/payment-status`)
            .send({ paymentStatus: "paid" });
        assert.equal(res.status, 200);
        assert.ok(auditActions(row.id).includes("submission.payment_paid"));

        const pass = await api(user).get(`/api/submissions/${row.id}/pass`);
        assert.equal(pass.status, 200);
        assert.match(pass.body.pass.code, /^SSP-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    });

    test("odrzuca nieznany status płatności", async () => {
        const admin = createUser({ role: "admin" });
        const row = createSubmission(createUser(), { status: "approved" });
        const res = await api(admin)
            .patch(`/api/admin/submissions/${row.id}/payment-status`)
            .send({ paymentStatus: "zaplacone" });
        assert.equal(res.status, 400);
    });
});

describe("panel admina", () => {
    test("wszystkie ścieżki admina są zamknięte dla zwykłego użytkownika", async () => {
        const user = createUser();
        const row = createSubmission(user);
        const client = api(user);
        for (const [method, url] of [
            ["get", "/api/admin/submissions"],
            ["get", "/api/admin/users"],
            ["get", "/api/admin/stats"],
            ["get", "/api/admin/audit-log"],
            ["patch", `/api/admin/submissions/${row.id}/status`],
            ["patch", `/api/admin/users/${user.id}/role`],
            ["post", "/api/admin/emails"],
        ]) {
            assert.equal((await client[method](url).send({})).status, 403, `${method} ${url}`);
            assert.equal((await api()[method](url).send({})).status, 401, `anon ${method} ${url}`);
        }
    });

    test("użytkownik nie nada sobie roli admina", async () => {
        const user = createUser();
        await api(user).patch(`/api/admin/users/${user.id}/role`).send({ role: "admin" });
        assert.equal(usersDb.findUserById(user.id).role, "user");
    });

    test("prośba o poprawki przywraca edycję zgłoszenia uczestnikowi", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const row = createSubmission(user, { status: "waitlist" });
        const note = "Prosimy o wyraźniejsze zdjęcia.";

        const res = await api(admin)
            .patch(`/api/admin/submissions/${row.id}/status`)
            .send({ status: "pending", adminNote: note, requestChanges: true });
        assert.equal(res.status, 200);

        const own = (await api(user).get("/api/submissions")).body.submissions[0];
        assert.equal(own.status, "pending");
        assert.equal(own.adminNote, note);

        const edit = await api(user).patch(`/api/submissions/${row.id}`).send({
            firstName: "Jan",
            lastName: "Kowalski",
            phone: "500600700",
            licensePlate: row.license_plate,
            carBrand: "Skoda Octavia",
            carDescription: "Nowy opis",
        });
        assert.equal(edit.status, 200, edit.body.message);
        assert.equal(edit.body.submission.carBrand, "Skoda Octavia");
    });

    test("akceptacja ponad limit miejsc wymaga potwierdzenia", async () => {
        saveSettings({ selectCapacity: 1 });
        try {
            const admin = createUser({ role: "admin" });
            createSubmission(createUser(), { status: "approved" });
            const row = createSubmission(createUser());
            const client = api(admin);

            const blocked = await client.patch(`/api/admin/submissions/${row.id}/status`).send({ status: "approved" });
            assert.equal(blocked.status, 409);
            assert.equal(blocked.body.code, "capacity_full");

            const forced = await client
                .patch(`/api/admin/submissions/${row.id}/status`)
                .send({ status: "approved", force: true });
            assert.equal(forced.status, 200);
        } finally {
            saveSettings({ selectCapacity: 0 });
        }
    });
});
