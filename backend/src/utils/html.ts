const sanitizeHtml = require("sanitize-html");

// Rich text from the admin editor (FAQ answers, regulamin) is rendered as HTML on
// public pages, so only plain formatting survives: no scripts, styles, iframes or
// event handlers, and links only to http(s)/mailto/tel or site-relative paths.
const RICH_TEXT_OPTIONS = {
    allowedTags: [
        "h2",
        "h3",
        "h4",
        "p",
        "br",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "s",
        "a",
        "ul",
        "ol",
        "li",
        "blockquote",
        "hr",
    ],
    allowedAttributes: {
        a: ["href", "target", "rel"],
        ol: ["type", "start"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    allowedSchemesAppliedToAttributes: ["href"],
    transformTags: {
        // External links always open safely in a new tab.
        a: (tagName, attribs) => {
            const isExternal = /^https?:\/\//i.test(attribs.href || "");
            return {
                tagName: "a",
                attribs: isExternal
                    ? {
                          href: attribs.href,
                          target: "_blank",
                          rel: "noopener noreferrer",
                      }
                    : { href: attribs.href || "" },
            };
        },
        ol: (tagName, attribs) => {
            const type = ["1", "a", "A", "i", "I"].includes(attribs.type)
                ? attribs.type
                : undefined;
            const start = /^\d{1,4}$/.test(attribs.start || "")
                ? attribs.start
                : undefined;
            return {
                tagName: "ol",
                attribs: {
                    ...(type && type !== "1" ? { type } : {}),
                    ...(start && start !== "1" ? { start } : {}),
                },
            };
        },
        b: "strong",
        i: "em",
    },
};

function sanitizeRichText(html) {
    return sanitizeHtml(String(html || ""), RICH_TEXT_OPTIONS).trim();
}

// True when the HTML has no visible text (e.g. "<p></p>" from an emptied editor).
function isRichTextEmpty(html) {
    return !sanitizeHtml(String(html || ""), { allowedTags: [] }).trim();
}

module.exports = { sanitizeRichText, isRichTextEmpty };
