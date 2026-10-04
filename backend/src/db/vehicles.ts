const db = require("./database");

const listByUserStmt = db.prepare(
    `SELECT * FROM vehicles WHERE user_id = ? ORDER BY updated_at DESC, id DESC`,
);
const findStmt = db.prepare(`SELECT * FROM vehicles WHERE id = ?`);
const insertStmt = db.prepare(`
    INSERT INTO vehicles (user_id, car_brand, license_plate, car_description, photos)
    VALUES (@userId, @carBrand, @licensePlate, @carDescription, @photos)
`);
const updateStmt = db.prepare(`
    UPDATE vehicles
    SET car_brand = @carBrand, license_plate = @licensePlate,
        car_description = @carDescription, updated_at = datetime('now')
    WHERE id = @id
`);
const updatePhotosStmt = db.prepare(`
    UPDATE vehicles SET photos = ?, updated_at = datetime('now') WHERE id = ?
`);
const deleteStmt = db.prepare(`DELETE FROM vehicles WHERE id = ?`);
const countForUserStmt = db.prepare(
    `SELECT COUNT(*) AS count FROM vehicles WHERE user_id = ?`,
);

function listVehicles(userId) {
    return listByUserStmt.all(userId);
}

function findVehicle(id) {
    return findStmt.get(id);
}

function createVehicle({ userId, carBrand, licensePlate, carDescription, photos }) {
    const result = insertStmt.run({
        userId,
        carBrand,
        licensePlate,
        carDescription: carDescription || "",
        photos: JSON.stringify(photos || []),
    });
    return findStmt.get(result.lastInsertRowid);
}

function updateVehicle(id, { carBrand, licensePlate, carDescription }) {
    updateStmt.run({ id, carBrand, licensePlate, carDescription: carDescription || "" });
    return findStmt.get(id);
}

function updateVehiclePhotos(id, photos) {
    updatePhotosStmt.run(JSON.stringify(photos), id);
    return findStmt.get(id);
}

function deleteVehicle(id) {
    deleteStmt.run(id);
}

function countVehicles(userId) {
    return countForUserStmt.get(userId).count;
}

module.exports = {
    listVehicles,
    findVehicle,
    createVehicle,
    updateVehicle,
    updateVehiclePhotos,
    deleteVehicle,
    countVehicles,
};
