// ports differ from the dev ones, so e2e can run next to `npm run dev`
module.exports = {
    API_PORT: 33100,
    MAIL_PORT: 33101,
    FRONT_PORT: 5199,
    // two-step login is required for admins; tests compute codes from this secret
    ADMIN: { email: "admin@streetshow.test", password: "Admin-e2e-123456", totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP" },
};
