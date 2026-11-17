// Garage: one entry per plate, also when saved from a submission.
const { api, createUser, createSubmission, attachPhotos } = require("./helpers");
const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const siteContentDb = require("../src/db/siteContent");
const submissionsDb = require("../src/db/submissions");

let png;
before(async () => {
    png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#c00" } }).png().toBuffer();
});

function addVehicle(client, carBrand, licensePlate, photoCount = 5) {
    return attachPhotos(
        client.post("/api/vehicles").field("carBrand", carBrand).field("licensePlate", licensePlate),
        png,
        photoCount,
    );
}

function submissionRequest(client, fields = {}) {
    const req = client.post("/api/submissions");
    const all = {
        firstName: "Jan",
        lastName: "Kowalski",
        phone: "500600700",
        licensePlate: `GD ${Math.floor(Math.random() * 90000) + 10000}`,
        carBrand: "BMW E46",
        carDescription: "Opis",
        acceptTerms: "true",
        ...fields,
    };
    for (const [key, value] of Object.entries(all)) req.field(key, value);
    return req;
}

describe("garaż", () => {
    test("to samo auto ze zgłoszenia trafia do garażu tylko raz", async () => {
        const user = createUser();
        const row = createSubmission(user, { status: "approved" });
        const client = api(user);

        const before = (await client.get("/api/submissions")).body.submissions[0];
        assert.equal(before.inGarage, false);

        assert.equal((await client.post(`/api/vehicles/from-submission/${row.id}`)).status, 201);
        const again = await client.post(`/api/vehicles/from-submission/${row.id}`);
        assert.equal(again.status, 409);
        assert.match(again.body.message, /już w Twoim garażu/);

        assert.equal((await client.get("/api/vehicles")).body.vehicles.length, 1);
        assert.equal((await client.get("/api/submissions")).body.submissions[0].inGarage, true);
    });

    test("w garażu mieści się 10 pojazdów", async () => {
        const client = api(createUser());
        for (let i = 0; i < 10; i += 1) {
            const res = await addVehicle(client, `Auto ${i}`, `GD 1000${i}`);
            assert.equal(res.status, 201, res.body.message);
        }
        const extra = await addVehicle(client, "Auto 11", "GD 20000");
        assert.equal(extra.status, 400);
        assert.match(extra.body.message, /maksymalnie 10/);

        const list = (await client.get("/api/vehicles")).body;
        assert.equal(list.maxVehicles, 10);
        assert.equal(list.vehicles.length, 10);
    });

    test("ręcznie też nie da się dodać ani ustawić zajętej rejestracji", async () => {
        const user = createUser();
        const client = api(user);

        const first = await addVehicle(client, "Skoda", "GD 12345");
        assert.equal(first.status, 201, first.body.message);
        const duplicate = await addVehicle(client, "Skoda 2", "gd12345");
        assert.equal(duplicate.status, 409);

        const other = await addVehicle(client, "Audi", "GD 99999");
        const rename = await client
            .patch(`/api/vehicles/${other.body.vehicle.id}`)
            .send({ carBrand: "Audi", licensePlate: "GD12345" });
        assert.equal(rename.status, 409);

        // editing a vehicle without changing its plate still works
        const same = await client
            .patch(`/api/vehicles/${first.body.vehicle.id}`)
            .send({ carBrand: "Skoda Octavia", licensePlate: "GD 12345" });
        assert.equal(same.status, 200, same.body.message);

        // another user's garage doesn't count
        const stranger = await addVehicle(api(createUser()), "Skoda", "GD 12345");
        assert.equal(stranger.status, 201);
    });
});

describe("wymagane dokładnie 5 zdjęć", () => {
    test("pojazd w garażu: 4 lub 0 zdjęć są odrzucane, 5 przyjęte", async () => {
        const client = api(createUser());
        for (const count of [0, 4]) {
            const res = await addVehicle(client, "Skoda", `GD 3000${count}`, count);
            assert.equal(res.status, 400);
            assert.match(res.body.message, /dokładnie 5 zdjęć/);
        }
        const ok = await addVehicle(client, "Skoda", "GD 30005");
        assert.equal(ok.status, 201, ok.body.message);
        assert.equal(ok.body.vehicle.photos.length, 5);
    });

    test("6 zdjęć jest odrzucanych", async () => {
        const res = await attachPhotos(submissionRequest(api(createUser())), png, 6);
        assert.equal(res.status, 400);
    });

    test("zgłoszenie: 4 zdjęcia są odrzucane, 5 przyjęte", async () => {
        const client = api(createUser());
        const short = await attachPhotos(submissionRequest(client), png, 4);
        assert.equal(short.status, 400);
        assert.match(short.body.message, /dokładnie 5 zdjęć pojazdu – teraz jest 4 zdjęcia/);

        const ok = await attachPhotos(submissionRequest(client), png);
        assert.equal(ok.status, 201, ok.body.message);
        assert.equal(ok.body.submission.photos.length, 5);
    });

    test("zgłoszenie ze zdjęciami z garażu wymaga 5 zdjęć w garażu", async () => {
        const user = createUser();
        const client = api(user);
        // a car saved from an older submission can have fewer photos
        const old = createSubmission(user, {
            edition: siteContentDb.getCurrentEdition() - 1,
            licensePlate: "GD 40000",
            photos: [],
        });
        const saved = await client.post(`/api/vehicles/from-submission/${old.id}`);
        assert.equal(saved.status, 201);

        const fromGarage = await submissionRequest(client, {
            licensePlate: "GD 40000",
            vehicleId: String(saved.body.vehicle.id),
        });
        assert.equal(fromGarage.status, 400);
        assert.match(fromGarage.body.message, /0 z 5 wymaganych zdjęć/);

        const full = await addVehicle(client, "Audi", "GD 40001");
        const ok = await submissionRequest(client, {
            licensePlate: "GD 40001",
            vehicleId: String(full.body.vehicle.id),
        });
        assert.equal(ok.status, 201, ok.body.message);
        assert.equal(ok.body.submission.photos.length, 5);
    });

    test("zmiana zdjęć: po zmianie musi zostać dokładnie 5", async () => {
        const client = api(createUser());
        const vehicle = (await addVehicle(client, "Skoda", "GD 50000")).body.vehicle;

        // dropping one photo leaves 4
        let req = client.put(`/api/vehicles/${vehicle.id}/photos`);
        for (const url of vehicle.photos.slice(0, 4)) req = req.field("keep", url);
        const tooFew = await req;
        assert.equal(tooFew.status, 400);
        assert.match(tooFew.body.message, /dokładnie 5 zdjęć/);

        // swapping one photo for a new one keeps 5
        req = client.put(`/api/vehicles/${vehicle.id}/photos`);
        for (const url of vehicle.photos.slice(0, 4)) req = req.field("keep", url);
        const swapped = await attachPhotos(req, png, 1);
        assert.equal(swapped.status, 200, swapped.body.message);
        assert.equal(swapped.body.vehicle.photos.length, 5);
    });

    test("ponowne zgłoszenie auta z poprzedniej edycji z mniej niż 5 zdjęciami jest odrzucane", async () => {
        const user = createUser();
        const old = createSubmission(user, {
            edition: siteContentDb.getCurrentEdition() - 1,
            status: "approved",
            photos: ["/uploads/submissions/1/a.jpg", "/uploads/submissions/1/b.jpg"],
        });
        const res = await api(user).post(`/api/submissions/${old.id}/resubmit`).send({ acceptTerms: true });
        assert.equal(res.status, 400);
        assert.match(res.body.message, /dokładnie 5 zdjęć/);
        assert.equal(submissionsDb.findSubmissionById(old.id).status, "approved");
    });
});
