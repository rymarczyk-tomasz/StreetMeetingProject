// Public address of the site, for links in e-mails and QR codes.
function getAppUrl() {
    return String(process.env.APP_URL || "https://www.streetshow.pl").replace(/\/+$/, "");
}

module.exports = { getAppUrl };
