// Garage: one entry per plate, also when saved from a submission.
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { api, createUser, createSubmission } = require("./helpers");

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
            const res = await client.post("/api/vehicles").field("carBrand", `Auto ${i}`).field("licensePlate", `GD 1000${i}`);
            assert.equal(res.status, 201, res.body.message);
        }
        const extra = await client.post("/api/vehicles").field("carBrand", "Auto 11").field("licensePlate", "GD 20000");
        assert.equal(extra.status, 400);
        assert.match(extra.body.message, /maksymalnie 10/);

        const list = (await client.get("/api/vehicles")).body;
        assert.equal(list.maxVehicles, 10);
        assert.equal(list.vehicles.length, 10);
    });

    test("ręcznie też nie da się dodać ani ustawić zajętej rejestracji", async () => {
        const user = createUser();
        const client = api(user);

        const first = await client.post("/api/vehicles").field("carBrand", "Skoda").field("licensePlate", "GD 12345");
        assert.equal(first.status, 201, first.body.message);
        const duplicate = await client.post("/api/vehicles").field("carBrand", "Skoda 2").field("licensePlate", "gd12345");
        assert.equal(duplicate.status, 409);

        const other = await client.post("/api/vehicles").field("carBrand", "Audi").field("licensePlate", "GD 99999");
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
        const stranger = await api(createUser()).post("/api/vehicles").field("carBrand", "Skoda").field("licensePlate", "GD 12345");
        assert.equal(stranger.status, 201);
    });
});
