// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest";
import { readCachedContent, writeCachedContent } from "./contentCache";

afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
});

describe("contentCache", () => {
    test("zapisuje i odczytuje treść dla zestawu kluczy", () => {
        expect(readCachedContent("home,edition")).toBeNull();
        writeCachedContent("home,edition", { home: { heroImage: "/uploads/content/nowe.webp" } });
        expect(readCachedContent("home,edition")).toEqual({ home: { heroImage: "/uploads/content/nowe.webp" } });
        expect(readCachedContent("faq")).toBeNull();
    });

    test("uszkodzony wpis albo zablokowany localStorage nie psuje strony", () => {
        localStorage.setItem("ss-content:v1:home", "{nie-json");
        expect(readCachedContent("home")).toBeNull();

        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("SecurityError");
        });
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("QuotaExceededError");
        });
        expect(readCachedContent("home")).toBeNull();
        expect(() => writeCachedContent("home", { home: {} })).not.toThrow();
    });
});
