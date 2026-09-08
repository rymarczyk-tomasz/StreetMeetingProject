const db = require("./database");

const insertUserStmt = db.prepare(`
    INSERT INTO users (email, password_hash, first_name, last_name, role)
    VALUES (@email, @passwordHash, @firstName, @lastName, @role)
`);

const findByEmailStmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
const findByIdStmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
const listUsersQuery = `
    SELECT id, email, first_name, last_name, role, is_active, created_at
    FROM users
`;
const updateRoleStmt = db.prepare(`UPDATE users SET role = ? WHERE id = ?`);
const updateActiveStmt = db.prepare(
    `UPDATE users SET is_active = ? WHERE id = ?`,
);
const updateProfileStmt = db.prepare(
    `UPDATE users
     SET first_name = ?, last_name = ?, phone = ?, license_plate = ?, car_brand = ?
     WHERE id = ?`,
);
const updatePasswordStmt = db.prepare(
    `UPDATE users SET password_hash = ? WHERE id = ?`,
);
const countAdminsStmt = db.prepare(
    `SELECT COUNT(*) AS count FROM users WHERE role = 'admin'`,
);

function createUser({ email, passwordHash, firstName, lastName, role }) {
    const result = insertUserStmt.run({
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: role || "user",
    });

    return findByIdStmt.get(result.lastInsertRowid);
}

function findUserByEmail(email) {
    return findByEmailStmt.get(email);
}

function findUserById(id) {
    return findByIdStmt.get(id);
}

function listUsers({ search, role, active } = {}) {
    const conditions = [];
    const parameters = [];

    if (search) {
        conditions.push(
            "(email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)",
        );
        const pattern = `%${search}%`;
        parameters.push(pattern, pattern, pattern);
    }

    if (role) {
        conditions.push("role = ?");
        parameters.push(role);
    }

    if (active !== undefined && active !== "") {
        conditions.push("is_active = ?");
        parameters.push(Number(active));
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    return db
        .prepare(`${listUsersQuery} ${where} ORDER BY created_at DESC`)
        .all(...parameters);
}

function getUserStats() {
    return db
        .prepare(
            `
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins
            FROM users
        `,
        )
        .get();
}

function updateUserRole(id, role) {
    updateRoleStmt.run(role, id);
    return findByIdStmt.get(id);
}

function updateUserActive(id, isActive) {
    updateActiveStmt.run(isActive ? 1 : 0, id);
    return findByIdStmt.get(id);
}

function updateUserProfile(
    id,
    { firstName, lastName, phone, licensePlate, carBrand },
) {
    updateProfileStmt.run(
        firstName || null,
        lastName || null,
        phone || null,
        licensePlate || null,
        carBrand || null,
        id,
    );
    return findByIdStmt.get(id);
}

function updateUserPassword(id, passwordHash) {
    updatePasswordStmt.run(passwordHash, id);
}

function countAdmins() {
    return countAdminsStmt.get().count;
}

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    listUsers,
    getUserStats,
    updateUserRole,
    updateUserActive,
    updateUserProfile,
    updateUserPassword,
    countAdmins,
};
