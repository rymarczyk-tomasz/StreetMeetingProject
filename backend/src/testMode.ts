// TEST_MODE=on in config/.env is only for a test server that can't deliver e-mails:
// e-mail confirmation isn't required to submit and admins can use the panel without
// two-step login. Nothing is written to the DB, so removing the variable restores both.
function isTestMode() {
    return /^(1|true|on)$/i.test(String(process.env.TEST_MODE || "").trim());
}

module.exports = { isTestMode };
