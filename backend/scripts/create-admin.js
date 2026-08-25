// Usage: node scripts/create-admin.js <email> <password> [firstName] [lastName]
require("dotenv").config({
    path: require("path").join(__dirname, "../config/.env"),
});

const bcrypt = require("bcryptjs");
const usersDb = require("../src/db/users");

async function main() {
    const [email, password, firstName, lastName] = process.argv.slice(2);

    if (!email || !password) {
        console.error(
            "Użycie: node scripts/create-admin.js <email> <hasło> [imię] [nazwisko]",
        );
        process.exit(1);
    }

    if (password.length < 8) {
        console.error("Hasło musi mieć co najmniej 8 znaków.");
        process.exit(1);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = usersDb.findUserByEmail(normalizedEmail);

    if (existing) {
        usersDb.updateUserRole(existing.id, "admin");
        console.log(
            `Użytkownik ${normalizedEmail} ma teraz rolę administratora.`,
        );
        return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = usersDb.createUser({
        email: normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        role: "admin",
    });

    console.log(`Utworzono administratora: ${user.email} (id: ${user.id}).`);
}

main().catch((error) => {
    console.error("Błąd tworzenia administratora:", error);
    process.exit(1);
});
