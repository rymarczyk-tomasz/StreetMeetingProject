// Google Consent Mode defaults and Google Tag Manager, only on streetshow.pl (not on the test
// server, localhost or e2e). Runs before everything else, so no tag fires before the choice.
// The banner itself is src/utils/cookieConsent.ts; it updates these flags when someone chooses.
(function () {
    if (!/(^|\.)streetshow\.pl$/.test(location.hostname)) return;

    window.dataLayer = window.dataLayer || [];
    function gtag() {
        window.dataLayer.push(arguments);
    }

    // a returning visitor's choice from the banner cookie (cc_cookie), so tags get it right away
    var accepted = [];
    try {
        var saved = document.cookie.match(/(?:^|; )cc_cookie=([^;]*)/);
        if (saved) accepted = JSON.parse(decodeURIComponent(saved[1])).categories || [];
    } catch {
        // unreadable cookie: treat as no choice yet
        accepted = [];
    }
    function state(category) {
        return accepted.indexOf(category) >= 0 ? "granted" : "denied";
    }

    gtag("consent", "default", {
        analytics_storage: state("analytics"),
        ad_storage: state("marketing"),
        ad_user_data: state("marketing"),
        ad_personalization: state("marketing"),
        functionality_storage: "granted",
        security_storage: "granted",
        wait_for_update: 500,
    });
    gtag("set", "ads_data_redaction", state("marketing") === "denied");

    // standard GTM loader (the "gtm.js" event starts the "All Pages" triggers)
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtm.js?id=GTM-PZ99CRHW";
    document.head.appendChild(script);
})();
