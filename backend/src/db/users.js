const db = require("./database");

const insertUserStmt = db.prepare(`
    INSERT INTO users (email, password_hash, first_name, last_name, role)
    VALUES (@email, @passwordHash, @firstName, @lastName, @role)
`);

const findByEmailStmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
const findByIdStmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
const listUsersStmt = db.prepare(
    `SELECT id, email, first_name, last_name, role, is_active, created_at FROM users ORDER BY created_at DESC`,
);
const updateRoleStmt = db.prepare(`UPDATE users SET role = ? WHERE id = ?`);
const updateActiveStmt = db.prepare(
    `UPDATE users SET is_active = ? WHERE id = ?`,
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

function listUsers() {
    return listUsersStmt.all();
}

function updateUserRole(id, role) {
    updateRoleStmt.run(role, id);
    return findByIdStmt.get(id);
}

function updateUserActive(id, isActive) {
    updateActiveStmt.run(isActive ? 1 : 0, id);
    return findByIdStmt.get(id);
}

function countAdmins() {
    return countAdminsStmt.get().count;
}

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    listUsers,
    updateUserRole,
    updateUserActive,
    countAdmins,
};
