// Cookie banner (vanilla-cookieconsent). Categories map to Google Consent Mode, which the tags in
// Google Tag Manager read (public/js/consent.js sets the defaults and loads GTM on streetshow.pl).
import api from "../api/client";

type CookieValue = { categories: string[]; revision: number; consentId: string };
type Library = typeof import("vanilla-cookieconsent");

// the test server shows the banner too, so the client can see it, but loads no GTM
export function hasCookieBanner(hostname: string) {
    return /(^|\.)streetshow\.pl$/.test(hostname) || hostname === "streetshow.tojest.dev";
}

// localhost shows the banner only on request (?cookies), for this browser tab;
// e2e and the usual dev setup never see it
function localPreviewRequested() {
    if (!/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) return false;
    try {
        if (new URLSearchParams(window.location.search).has("cookies")) {
            sessionStorage.setItem("cookie-banner-preview", "1");
        }
        return sessionStorage.getItem("cookie-banner-preview") === "1";
    } catch {
        return false;
    }
}

export function cookieBannerEnabled() {
    return hasCookieBanner(window.location.hostname) || localPreviewRequested();
}

// what Consent Mode gets for the categories someone accepted
export function consentModeState(categories: string[]) {
    const state = (category: string) => (categories.includes(category) ? "granted" : "denied");
    return {
        analytics_storage: state("analytics"),
        ad_storage: state("marketing"),
        ad_user_data: state("marketing"),
        ad_personalization: state("marketing"),
    };
}

const PRIVACY_LINK = '<a href="/polityka-prywatnosci">Polityka prywatności</a>';
// GA and Meta set their cookies on the whole domain
const DOMAIN = "streetshow.pl";

const CONFIG = {
    // bump when the tools change: everyone is asked again (and public/js/consent.js
    // still applies the old choice until then, which is fine for a few seconds)
    revision: 0,
    cookie: { expiresAfterDays: 365 },
    guiOptions: {
        consentModal: { layout: "bar inline" as const, position: "bottom" as const, equalWeightButtons: true },
        preferencesModal: { layout: "box" as const, equalWeightButtons: true },
    },
    categories: {
        necessary: { enabled: true, readOnly: true },
        analytics: { autoClear: { cookies: [{ name: /^_ga/, domain: DOMAIN }] } },
        marketing: { autoClear: { cookies: [{ name: /^_fb[pc]$/, domain: DOMAIN }] } },
    },
    language: {
        default: "pl",
        translations: {
            pl: {
                consentModal: {
                    title: "Używamy plików cookies",
                    description:
                        "Niezbędne pliki cookies pozwalają stronie działać (logowanie, bezpieczeństwo). Za Twoją zgodą użyjemy też narzędzi statystycznych (Google Analytics) i marketingowych (Meta Pixel), żeby mierzyć ruch na stronie i skuteczność reklam. Wybór zmienisz w każdej chwili w „Ustawienia cookies” w stopce strony.",
                    acceptAllBtn: "Akceptuję wszystkie",
                    acceptNecessaryBtn: "Tylko niezbędne",
                    showPreferencesBtn: "Wybieram sam",
                    footer: PRIVACY_LINK,
                },
                preferencesModal: {
                    title: "Ustawienia cookies",
                    acceptAllBtn: "Akceptuję wszystkie",
                    acceptNecessaryBtn: "Tylko niezbędne",
                    savePreferencesBtn: "Zapisz wybór",
                    closeIconLabel: "Zamknij",
                    sections: [
                        {
                            description:
                                "Wybierz, na które pliki cookies się zgadzasz. Odmowa nie ogranicza korzystania ze strony.",
                        },
                        {
                            title: "Niezbędne",
                            description:
                                "Logowanie, sesja, bezpieczeństwo i zapamiętanie tego wyboru. Bez nich strona nie działa, dlatego nie można ich wyłączyć.",
                            linkedCategory: "necessary",
                        },
                        {
                            title: "Statystyki",
                            description:
                                "Google Analytics 4 (Google Ireland Ltd.): liczba odwiedzin i to, jak korzystasz ze strony. Pliki cookies _ga i _ga_*, do 2 lat.",
                            linkedCategory: "analytics",
                        },
                        {
                            title: "Marketing",
                            description:
                                "Meta Pixel (Meta Platforms Ireland Ltd.): mierzenie skuteczności reklam Street Show na Facebooku i Instagramie. Pliki cookies _fbp i _fbc, do 90 dni.",
                            linkedCategory: "marketing",
                        },
                        { title: "Więcej informacji", description: `Szczegóły są w dokumencie ${PRIVACY_LINK}.` },
                    ],
                },
            },
        },
    },
};

let library: Library | null = null;

function updateConsentMode(cookie: CookieValue) {
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    // gtag() pushes its arguments object, not an array
    (function gtag(..._args: unknown[]) {
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer.push(arguments);
    })("consent", "update", consentModeState(cookie.categories));
}

// anonymous record that the banner worked: random id, choice, revision; no IP
function logConsent(cookie: CookieValue) {
    api.post("/consents", {
        consentId: cookie.consentId,
        categories: cookie.categories,
        revision: cookie.revision,
    }).catch(() => {
        // the choice is saved in the browser anyway
    });
}

export async function startCookieConsent() {
    if (!cookieBannerEnabled()) return;
    const [cookieConsent] = await Promise.all([
        import("vanilla-cookieconsent"),
        import("vanilla-cookieconsent/dist/cookieconsent.css"),
    ]);
    library = cookieConsent;
    await cookieConsent.run({
        ...CONFIG,
        onConsent: ({ cookie }) => updateConsentMode(cookie),
        onFirstConsent: ({ cookie }) => logConsent(cookie),
        onChange: ({ cookie }) => {
            updateConsentMode(cookie);
            logConsent(cookie);
        },
    });
}

// footer "Ustawienia cookies": change or withdraw the consent
export function openCookieSettings() {
    library?.showPreferences();
}
