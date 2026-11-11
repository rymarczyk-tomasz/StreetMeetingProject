const {
    app,
    api,
    createUser,
    createSubmission,
    usersDb,
} = require("./helpers");
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const request = require("supertest");
const { setTimeout: wait } = require("node:timers/promises");
const dateSubscribersDb = require("../src/db/dateSubscribers");
const { getUserSubmissionsDir } = require("../src/utils/paths");

describe("żądania z obcej strony", () => {
    test("zmiana danych z innego adresu jest odrzucana, z własnego przechodzi", async () => {
        const user = createUser();
        const body = { firstName: "Adam", lastName: "Nowak", phone: "" };

        const foreign = await api(user)
            .patch("/api/auth/me")
            .set("Origin", "https://sklep.streetshow.pl")
            .send(body);
        assert.equal(foreign.status, 403);
        assert.equal(usersDb.findUserById(user.id).first_name, "Jan");

        const nullOrigin = await api(user).patch("/api/auth/me").set("Origin", "null").send(body);
        assert.equal(nullOrigin.status, 403);

        // CORS_ORIGINS default in tests
        const own = await api(user)
            .patch("/api/auth/me")
            .set("Origin", "http://localhost:5173")
            .send(body);
        assert.equal(own.status, 200);

        const sameHost = await api(user)
            .patch("/api/auth/me")
            .set("Host", "www.streetshow.test")
            .set("Origin", "https://www.streetshow.test")
            .send(body);
        assert.equal(sameHost.status, 200);
    });

    test("odczyt z obcej strony nie dostaje nagłówka CORS", async () => {
        const res = await request(app).get("/api/health").set("Origin", "https://evil.example");
        assert.equal(res.headers["access-control-allow-origin"], undefined);
    });
});

describe("wylogowanie ze wszystkich urządzeń", () => {
    test("stary token dostępu przestaje działać od razu, nie po 15 minutach", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const stolen = api(user);
        assert.equal((await stolen.get("/api/auth/me")).status, 200);

        await wait(5);
        assert.equal((await api(admin).post(`/api/admin/users/${user.id}/logout`)).status, 200);
        assert.equal((await stolen.get("/api/auth/me")).status, 401);

        // a session started afterwards works
        await wait(5);
        assert.equal((await api(user).get("/api/auth/me")).status, 200);
    });

    test("zmiana hasła unieważnia tokeny wydane wcześniej", async () => {
        const user = createUser();
        const old = api(user);
        await wait(5);
        const res = await api(user)
            .post("/api/auth/change-password")
            .send({ currentPassword: "Haslo-testowe-123", newPassword: "Nowe-haslo-456" });
        assert.equal(res.status, 200);
        assert.equal((await old.get("/api/auth/me")).status, 401);

        // the cookie from the response is the new session
        const cookie = res.headers["set-cookie"].find((value) => value.startsWith("access_token="));
        const fresh = await request(app).get("/api/auth/me").set("Cookie", cookie.split(";")[0]);
        assert.equal(fresh.status, 200);
    });
});

describe("admin bez logowania dwuetapowego", () => {
    test("nie obejrzy cudzych zdjęć ani potwierdzeń przelewu", async () => {
        const owner = createUser();
        createSubmission(owner);
        const dir = getUserSubmissionsDir(owner.id);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "auto.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
        fs.writeFileSync(path.join(dir, "proof-1.pdf"), "%PDF-1.4");

        const photo = `/api/submissions/photos/${owner.id}/auto.jpg`;
        const proof = `/api/submissions/proofs/${owner.id}/proof-1.pdf`;

        const halfAdmin = createUser({ role: "admin", twoFactor: false });
        assert.equal((await api(halfAdmin).get(photo)).status, 404);
        assert.equal((await api(halfAdmin).get(proof)).status, 404);

        const admin = createUser({ role: "admin" });
        assert.equal((await api(admin).get(photo)).status, 200);
        assert.equal((await api(admin).get(proof)).status, 200);
        assert.equal((await api(owner).get(photo)).status, 200);
        assert.equal((await api(createUser()).get(photo)).status, 404);
    });
});

describe("eksport listy „Powiadom o dacie”", () => {
    test("adres wyglądający jak formuła nie trafia do Excela jako formuła", async () => {
        for (const email of ["=cmd|calc!a1@example.com", "zwykly@example.com"]) {
            assert.ok(dateSubscribersDb.confirmByToken(dateSubscribersDb.addSubscriber(email, 2027)));
        }
        const admin = createUser({ role: "admin" });
        const res = await api(admin).get("/api/admin/date-subscribers/export");
        assert.equal(res.status, 200);
        const lines = res.text.split("\r\n");
        assert.ok(lines.some((line) => line.startsWith("'=cmd|calc!a1@example.com;")));
        assert.ok(lines.some((line) => line.startsWith("zwykly@example.com;")));
        assert.ok(!lines.some((line) => line.startsWith("=")));
    });
});

describe("zdjęcia zgłoszeń", () => {
    test("są zapisywane bez EXIF, obrócone i nie większe niż 4000 px", async () => {
        const sharp = require("sharp");
        const submissionsDb = require("../src/db/submissions");
        const user = createUser();
        // phone photo: 5000x3000 stored sideways with a GPS position
        const upload = await sharp({
            create: { width: 5000, height: 3000, channels: 3, background: { r: 200, g: 30, b: 30 } },
        })
            .withMetadata({ orientation: 6 })
            .withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "54/1 22/1 0/1" } })
            .jpeg({ quality: 95 })
            .toBuffer();
        assert.equal((await sharp(upload).metadata()).orientation, 6);
        assert.ok((await sharp(upload).metadata()).exif);

        const res = await api(user)
            .post("/api/submissions")
            .field("firstName", "Jan")
            .field("lastName", "Kowalski")
            .field("phone", "600700800")
            .field("licensePlate", "GD 12345")
            .field("carBrand", "BMW E36")
            .field("carDescription", "Opis")
            .field("acceptTerms", "true")
            .attach("photos", upload, "IMG_0001.jpg");
        assert.equal(res.status, 201, JSON.stringify(res.body));

        const stored = JSON.parse(submissionsDb.findSubmissionById(res.body.submission.id).photos);
        const file = path.join(getUserSubmissionsDir(user.id), path.basename(stored[0]));
        const meta = await sharp(file).metadata();
        assert.equal(meta.exif, undefined);
        assert.equal(meta.format, "jpeg");
        // orientation 6 = rotate 90°, so the long edge is now vertical
        assert.deepEqual([meta.width, meta.height], [2400, 4000]);
        assert.deepEqual(fs.readdirSync(getUserSubmissionsDir(user.id)).length, 1);
    });

    test("plik, którego nie da się zdekodować, jest odrzucany i nie zostaje na dysku", async () => {
        const user = createUser();
        const fake = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("<script>alert(1)</script>")]);
        const res = await api(user)
            .post("/api/submissions")
            .field("firstName", "Jan")
            .field("lastName", "Kowalski")
            .field("phone", "600700800")
            .field("licensePlate", "GD 54321")
            .field("carBrand", "Audi")
            .field("carDescription", "Opis")
            .field("acceptTerms", "true")
            .attach("photos", fake, "auto.jpg");
        assert.equal(res.status, 400);
        const dir = getUserSubmissionsDir(user.id);
        await wait(50);
        assert.equal(fs.existsSync(dir) ? fs.readdirSync(dir).length : 0, 0);
    });
});
