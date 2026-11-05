// Usage: node scripts/create-admin.js <email> <password> [firstName] [lastName]
require("dotenv").config({
    path: require("path").join(process.cwd(), "config/.env"),
});

const bcrypt = require("bcryptjs");
const usersDb = require("../src/db/users");
const { validatePassword } = require("../src/utils/validation");

async function main() {
    const [email, password, firstName, lastName] = process.argv.slice(2);

    if (!email || !password) {
        console.error(
            "Użycie: node scripts/create-admin.js <email> <hasło> [imię] [nazwisko]",
        );
        process.exit(1);
    }

    const passwordError = validatePassword(password, { admin: true });
    if (passwordError) {
        console.error(passwordError);
        process.exit(1);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = usersDb.findUserByEmail(normalizedEmail);

    if (existing) {
        usersDb.updateUserRole(existing.id, "admin");
        console.log(
            `Użytkownik ${normalizedEmail} ma teraz rolę administratora (hasło bez zmian). Przy pierwszym wejściu do panelu włączy logowanie dwuetapowe.`,
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

    usersDb.setEmailVerified(user.id);
    console.log(
        `Utworzono administratora: ${user.email} (id: ${user.id}). Po zalogowaniu panel poprosi o włączenie logowania dwuetapowego.`,
    );
}

main().catch((error) => {
    console.error("Błąd tworzenia administratora:", error);
    process.exit(1);
});
