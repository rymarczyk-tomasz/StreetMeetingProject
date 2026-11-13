import { heroCrop } from "../utils/hero";
import type { HeroCrop } from "../utils/hero";

export default function HeroPhoto() {
    return (
        <div className="hero-photo" aria-hidden="true">
            <div className="hero-photo-inner" />
        </div>
    );
}

// Miniature of what sits on top of the photo on the home page (shadow, title,
// lead, buttons), so a crop can be judged against it. Sized in container units:
// the parent needs container-type: size.
export function HeroMock({ title, phone = false }: { title?: string; phone?: boolean }) {
    return (
        <div className={`hero-mock${phone ? " is-phone" : ""}`} aria-hidden="true">
            <span className="hero-mock-eyebrow" />
            <span className="hero-mock-title">{title || "Street Show"}</span>
            <span className="hero-mock-lead" />
            <span className="hero-mock-lead is-short" />
            <span className="hero-mock-actions">
                <span className="hero-mock-button is-primary" />
                <span className="hero-mock-button" />
            </span>
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
    title?: string;
    phone?: boolean;
};

export function HeroPreview({ image, crop, rotated, width, height, label, title, phone }: HeroPreviewProps) {
    const { x, y, zoom } = heroCrop(crop);

    return (
        <figure className="hero-preview">
            <div
                className="hero-preview-frame"
                style={{ width, maxWidth: "100%", aspectRatio: `${width} / ${height}` }}
            >
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
                <HeroMock title={title} phone={phone} />
            </div>
            <figcaption>{label}</figcaption>
        </figure>
    );
}
