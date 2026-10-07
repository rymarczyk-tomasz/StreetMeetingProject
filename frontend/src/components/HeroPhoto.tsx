import { heroCrop } from "../utils/hero";
import type { HeroCrop } from "../utils/hero";

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

export function HeroPreview({ image, crop, rotated, width, height, label }: HeroPreviewProps) {
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
                <span className="hero-preview-title">STREET SHOW</span>
            </div>
            <figcaption>{label}</figcaption>
        </figure>
    );
}
