// Bundled photos (/img/photos/<name>.webp) that also have resized copies in
// /img/optimized/photos/<name>-{400,800,1200}.webp. The originals are several
// thousand pixels wide, so cards should never load them directly.
const OPTIMIZED_PHOTOS = new Set([
    "10",
    "2024.03.29 Street Meeting 2-13",
    "6",
    "7",
    "Street Meeting Poland 2024-139",
    "Street Meeting Poland 2024-252",
]);

const WIDTHS = [400, 800, 1200];

const CARD_SIZES = "(min-width: 1200px) 440px, (min-width: 768px) 50vw, 100vw";

export function cardImageProps(url: string) {
    const match = /^\/img\/photos\/(.+)\.webp$/.exec(url || "");
    if (!match || !OPTIMIZED_PHOTOS.has(match[1])) return { src: url };

    const base = `/img/optimized/photos/${match[1]}`;
    return {
        src: `${base}-800.webp`,
        srcSet: WIDTHS.map((width) => `${base}-${width}.webp ${width}w`).join(", "),
        sizes: CARD_SIZES,
    };
}
