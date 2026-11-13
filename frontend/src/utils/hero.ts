import type { CSSProperties } from "react";

// Hero photo settings from the CMS (Admin → Treści strony → Home).

export type HeroCrop = { x: number; y: number; zoom: number };

export const DEFAULT_HERO_CROP: HeroCrop = { x: 50, y: 50, zoom: 1 };

export function heroCrop(crop?: Partial<HeroCrop>): HeroCrop {
    return { ...DEFAULT_HERO_CROP, ...(crop || {}) };
}

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

function clampPercent(value: number) {
    return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
}

type Size = { width: number; height: number };

// Crop after dragging the photo by (dx, dy) screen pixels inside a frame.
// The photo covers the frame and is scaled by zoom around x%/y%, which places it
// like a photo zoom times larger: its edge sits at p% of (frame - photo). When
// the frame is rotated 90° clockwise (phones), screen axes map to the photo's
// own axes: right → up, down → right.
export function dragHeroCrop(
    crop: HeroCrop,
    drag: { dx: number; dy: number },
    frame: Size,
    image: Size,
    rotated = false,
): HeroCrop {
    const box = rotated ? { width: frame.height, height: frame.width } : frame;
    const move = rotated ? { dx: drag.dy, dy: -drag.dx } : drag;
    const cover = Math.max(box.width / image.width, box.height / image.height) * crop.zoom;
    const spareX = box.width - image.width * cover;
    const spareY = box.height - image.height * cover;
    return {
        ...crop,
        // under a pixel of spare room there is nothing to slide along that axis
        x: Math.abs(spareX) < 1 ? crop.x : clampPercent(crop.x + (move.dx / spareX) * 100),
        y: Math.abs(spareY) < 1 ? crop.y : clampPercent(crop.y + (move.dy / spareY) * 100),
    };
}

export function shouldRotateOnMobile(home) {
    return Boolean(home.heroMobileRotate && !home.heroImageMobile);
}
