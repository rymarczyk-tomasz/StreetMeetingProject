// Usage: node dist/scripts/reset-2fa.js <email>
// Last resort when an admin lost both the phone and the backup codes and there is
// no other admin to reset it in the panel. Needs shell access to the server.
require("dotenv").config({
    path: require("path").join(process.cwd(), "config/.env"),
});

const usersDb = require("../src/db/users");
const twoFactorDb = require("../src/db/twoFactor");
const refreshTokensDb = require("../src/db/refreshTokens");
const auditLogDb = require("../src/db/auditLog");

const email = String(process.argv[2] || "").trim().toLowerCase();
if (!email) {
    console.error("Użycie: node dist/scripts/reset-2fa.js <email>");
    process.exit(1);
}

const user = usersDb.findUserByEmail(email);
if (!user) {
    console.error(`Nie ma konta ${email}.`);
    process.exit(1);
}

twoFactorDb.reset(user.id);
refreshTokensDb.revokeAllUserTokens(user.id);
auditLogDb.createAuditEntry({
    adminId: null,
    action: "user.two_factor_reset",
    targetType: "user",
    targetId: user.id,
    details: { email, via: "cli" },
});
console.log(`Wyłączono logowanie dwuetapowe dla ${email}. Po zalogowaniu panel poprosi o ponowne włączenie.`);
