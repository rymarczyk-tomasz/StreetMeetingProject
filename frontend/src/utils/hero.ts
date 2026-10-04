import type { CSSProperties } from "react";

// Hero photo settings from the CMS (Admin → Treści strony → Home).

export type HeroCrop = { x: number; y: number; zoom: number };

export const DEFAULT_HERO_CROP: HeroCrop = { x: 50, y: 50, zoom: 1 };

export function heroCrop(crop?: Partial<HeroCrop>): HeroCrop {
    return { ...DEFAULT_HERO_CROP, ...(crop || {}) };
}

// → CSS variables on <header class="home">, read by .hero-photo-inner in custom.css.
export function heroPhotoVars(home): CSSProperties {
    const desktop = heroCrop(home.heroCropDesktop);
    const mobile = heroCrop(home.heroCropMobile);
    const vars = {
        "--hd-x": `${desktop.x}%`,
        "--hd-y": `${desktop.y}%`,
        "--hd-zoom": desktop.zoom,
        "--hm-x": `${mobile.x}%`,
        "--hm-y": `${mobile.y}%`,
        "--hm-zoom": mobile.zoom,
    };
    if (home.heroImage) vars["--hero-image"] = `url("${home.heroImage}")`;
    if (home.heroImageMobile) {
        vars["--hero-image-mobile"] = `url("${home.heroImageMobile}")`;
    }
    return vars as CSSProperties;
}

// Only rotate the main (landscape) photo; a dedicated phone photo is already upright.
export function shouldRotateOnMobile(home) {
    return Boolean(home.heroMobileRotate && !home.heroImageMobile);
}
