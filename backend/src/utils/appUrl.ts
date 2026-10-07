function getAppUrl() {
    return String(process.env.APP_URL || "https://www.streetshow.pl").replace(/\/+$/, "");
}

module.exports = { getAppUrl };
