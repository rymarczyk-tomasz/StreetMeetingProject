const db = require("./database");

const insertUserStmt = db.prepare(`
    INSERT INTO users (email, password_hash, first_name, last_name, role, terms_accepted_at, terms_version)
    VALUES (@email, @passwordHash, @firstName, @lastName, @role,
            CASE WHEN @termsVersion IS NULL THEN NULL ELSE datetime('now') END, @termsVersion)
`);

const findByEmailStmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
const findByIdStmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
const listUsersQuery = `
    SELECT id, email, first_name, last_name, role, is_active, gate_staff, created_at
    FROM users
`;
const updateRoleStmt = db.prepare(`UPDATE users SET role = ? WHERE id = ?`);
const updateActiveStmt = db.prepare(
    `UPDATE users SET is_active = ? WHERE id = ?`,
);
const updateGateStaffStmt = db.prepare(
    `UPDATE users SET gate_staff = ? WHERE id = ?`,
);
// Cars live in the garage (vehicles table) now; license_plate/car_brand on users
// are legacy columns left untouched.
const updateProfileStmt = db.prepare(
    `UPDATE users SET first_name = ?, last_name = ?, phone = ? WHERE id = ?`,
);
const setEmailVerifiedStmt = db.prepare(
    `UPDATE users SET email_verified_at = datetime('now') WHERE id = ?`,
);
const updateEmailStmt = db.prepare(
    `UPDATE users SET email = ?, email_verified_at = datetime('now') WHERE id = ?`,
);
const updatePasswordStmt = db.prepare(
    `UPDATE users SET password_hash = ? WHERE id = ?`,
);
const countAdminsStmt = db.prepare(
    `SELECT COUNT(*) AS count FROM users WHERE role = 'admin'`,
);
const deleteUserStmt = db.prepare(`DELETE FROM users WHERE id = ?`);

// termsVersion: regulamin version accepted at registration (null for CLI-created admins).
function createUser({
    email,
    passwordHash,
    firstName,
    lastName,
    role,
    termsVersion = null,
}: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    termsVersion?: string | null;
}) {
    const result = insertUserStmt.run({
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: role || "user",
        termsVersion,
    });

    return findByIdStmt.get(result.lastInsertRowid);
}

function setEmailVerified(id) {
    setEmailVerifiedStmt.run(id);
}

// The new address was confirmed through a link sent to it, so it is verified.
function updateUserEmail(id, email) {
    updateEmailStmt.run(email, id);
    return findByIdStmt.get(id);
}

function findUserByEmail(email) {
    return findByEmailStmt.get(email);
}

function findUserById(id) {
    return findByIdStmt.get(id);
}

function listUsers({
    search,
    role,
    active,
}: { search?: string; role?: string; active?: string | number } = {}) {
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

function updateUserGateStaff(id, gateStaff) {
    updateGateStaffStmt.run(gateStaff ? 1 : 0, id);
    return findByIdStmt.get(id);
}

// Admins can always check cars in; gate staff can do only that.
function canCheckIn(user) {
    return Boolean(user && (user.role === "admin" || user.gate_staff));
}

function updateUserProfile(id, { firstName, lastName, phone }) {
    updateProfileStmt.run(firstName || null, lastName || null, phone || null, id);
    return findByIdStmt.get(id);
}

function updateUserPassword(id, passwordHash) {
    updatePasswordStmt.run(passwordHash, id);
}

function countAdmins() {
    return countAdminsStmt.get().count;
}

// Cascades to submissions, refresh/reset tokens and the user's audit entries.
function deleteUser(id) {
    deleteUserStmt.run(id);
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
    deleteUser,
    setEmailVerified,
    updateUserEmail,
    updateUserGateStaff,
    canCheckIn,
};
