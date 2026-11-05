// ports differ from the dev ones, so e2e can run next to `npm run dev`
module.exports = {
    API_PORT: 33100,
    MAIL_PORT: 33101,
    FRONT_PORT: 5199,
    ADMIN: { email: "admin@streetshow.test", password: "Admin-e2e-123" },
};
