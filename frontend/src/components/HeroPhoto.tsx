import { heroCrop } from "../utils/hero";
import type { HeroCrop } from "../utils/hero";

// The home page hero photo. The same markup is used by the admin crop preview,
// so what the admin sees is exactly what the page renders.
// Styles: .hero-photo / .hero-photo-inner in public/css/custom.css; values come
// from CSS variables set by heroPhotoVars() on the <header class="home">.
export default function HeroPhoto() {
    return (
        <div className="hero-photo" aria-hidden="true">
            <div className="hero-photo-inner" />
        </div>
    );
}

type HeroPreviewProps = {
    image: string;
    crop?: Partial<HeroCrop>;
    rotated?: boolean;
    width: number;
    height: number;
    label: string;
};

// Fixed-size preview with explicit values (no media queries), for the admin panel.
export function HeroPreview({ image, crop, rotated, width, height, label }: HeroPreviewProps) {
    const { x, y, zoom } = heroCrop(crop);

    return (
        <figure className="hero-preview">
            <div className="hero-preview-frame" style={{ width, height }}>
                <div
                    className="hero-photo"
                    style={
                        rotated
                            ? {
                                  inset: "auto",
                                  top: "50%",
                                  left: "50%",
                                  width: height,
                                  height: width,
                                  transform: "translate(-50%, -50%) rotate(90deg)",
                              }
                            : undefined
                    }
                >
                    <div
                        className="hero-photo-inner"
                        style={{
                            backgroundImage: `url("${image}")`,
                            backgroundPosition: `${x}% ${y}%`,
                            transform: `scale(${zoom})`,
                            transformOrigin: `${x}% ${y}%`,
                        }}
                    />
                </div>
                <span className="hero-preview-title">STREET SHOW</span>
            </div>
            <figcaption>{label}</figcaption>
        </figure>
    );
}
