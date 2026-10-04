import { useState } from "react";
import { HeroPreview } from "../../components/HeroPhoto";
import { heroCrop, shouldRotateOnMobile } from "../../utils/hero";

// Preview frames: typical hero shapes (screen minus the header).
const DESKTOP_FRAMES = [
    { label: "Szeroki monitor", width: 360, height: 150 },
    { label: "Laptop", width: 300, height: 170 },
];
const PHONE_FRAME = { label: "Telefon (pionowo)", width: 150, height: 285 };

const DEVICES = [
    ["desktop", "Komputer", "heroCropDesktop"],
    ["mobile", "Telefon", "heroCropMobile"],
] as const;

function clampPercent(value) {
    return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
}

// The phone picker can show the photo turned 90° clockwise (like the phone does).
// Crop x/y always refer to the original photo, so screen positions are converted:
// on screen u (from left) = 100 - y, v (from top) = x.
function toScreen({ x, y }, rotated) {
    return rotated ? { u: 100 - y, v: x } : { u: x, v: y };
}

function fromScreen({ u, v }, rotated) {
    return rotated ? { x: v, y: 100 - u } : { x: u, y: v };
}

// Click or drag on the photo to choose the point that must stay in view;
// the slider zooms in around that point. Desktop and phone are set separately.
export default function HeroCropEditor({ home, update }) {
    const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
    const [imageSize, setImageSize] = useState(null);
    const field = DEVICES.find(([id]) => id === device)[2];
    const crop = heroCrop(home[field]);
    const rotated = shouldRotateOnMobile(home);
    const image =
        device === "mobile" && home.heroImageMobile ? home.heroImageMobile : home.heroImage;
    // Show the photo upright-as-on-the-phone while framing the phone version.
    const pickerRotated = device === "mobile" && rotated && Boolean(imageSize);
    const marker = toScreen(crop, pickerRotated);

    function setCrop(patch) {
        update({ [field]: { ...crop, ...patch } });
    }

    function setScreenPoint(u, v) {
        const point = fromScreen({ u: clampPercent(u), v: clampPercent(v) }, pickerRotated);
        setCrop({ x: clampPercent(point.x), y: clampPercent(point.y) });
    }

    function pickPoint(event) {
        const box = event.currentTarget.getBoundingClientRect();
        setScreenPoint(
            ((event.clientX - box.left) / box.width) * 100,
            ((event.clientY - box.top) / box.height) * 100,
        );
    }

    if (!image) return null;

    return (
        <fieldset className="hero-crop-editor">
            <legend>Kadrowanie zdjęcia</legend>
            <nav className="hero-crop-tabs" aria-label="Urządzenie">
                {DEVICES.map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        className={device === id ? "is-active" : "button-secondary"}
                        aria-pressed={device === id}
                        onClick={() => setDevice(id)}
                    >
                        {label}
                    </button>
                ))}
            </nav>
            <p className="admin-hint">
                Kliknij lub przeciągnij po zdjęciu, aby wskazać miejsce, które ma być
                zawsze widoczne{device === "desktop" ? " na komputerze" : " na telefonie"}.
                Suwakiem przybliżysz kadr. Podgląd obok pokazuje efekt.
                {device === "mobile" &&
                    rotated &&
                    " Zdjęcie jest pokazane obrócone o 90°, tak jak na telefonie."}
            </p>

            <div className="hero-crop-layout">
                <div className="hero-crop-picker-wrap">
                    <div
                        className={`hero-crop-picker${pickerRotated ? " is-rotated" : ""}`}
                        style={
                            pickerRotated
                                ? { aspectRatio: `${imageSize.height} / ${imageSize.width}` }
                                : undefined
                        }
                        role="slider"
                        aria-label="Punkt kadru"
                        aria-valuetext={`${Math.round(marker.u)}% od lewej, ${Math.round(marker.v)}% od góry`}
                        tabIndex={0}
                        onPointerDown={(event) => {
                            event.currentTarget.setPointerCapture(event.pointerId);
                            pickPoint(event);
                        }}
                        onPointerMove={(event) => {
                            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                pickPoint(event);
                            }
                        }}
                        onKeyDown={(event) => {
                            // Arrows move the marker on screen (also when rotated).
                            const step = event.shiftKey ? 10 : 2;
                            const moves = {
                                ArrowLeft: [-step, 0],
                                ArrowRight: [step, 0],
                                ArrowUp: [0, -step],
                                ArrowDown: [0, step],
                            };
                            const move = moves[event.key];
                            if (!move) return;
                            event.preventDefault();
                            setScreenPoint(marker.u + move[0], marker.v + move[1]);
                        }}
                    >
                        <img
                            src={image}
                            alt=""
                            draggable={false}
                            onLoad={(event) =>
                                setImageSize({
                                    width: event.currentTarget.naturalWidth,
                                    height: event.currentTarget.naturalHeight,
                                })
                            }
                            style={
                                pickerRotated
                                    ? {
                                          // Turned 90° clockwise inside a box with swapped
                                          // proportions; width = box height.
                                          position: "absolute",
                                          top: "50%",
                                          left: "50%",
                                          width: `${(imageSize.width / imageSize.height) * 100}%`,
                                          maxWidth: "none",
                                          transform: "translate(-50%, -50%) rotate(90deg)",
                                      }
                                    : undefined
                            }
                        />
                        <span
                            className="hero-crop-marker"
                            style={{ left: `${marker.u}%`, top: `${marker.v}%` }}
                        />
                    </div>
                    <label>
                        Przybliżenie: {Math.round(crop.zoom * 100)}%
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={crop.zoom}
                            onChange={(event) => setCrop({ zoom: Number(event.target.value) })}
                        />
                    </label>
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={() => setCrop({ x: 50, y: 50, zoom: 1 })}
                    >
                        Wyśrodkuj i wyzeruj przybliżenie
                    </button>
                </div>

                <div className="hero-crop-previews">
                    {device === "desktop" ? (
                        DESKTOP_FRAMES.map((frame) => (
                            <HeroPreview key={frame.label} image={image} crop={crop} {...frame} />
                        ))
                    ) : (
                        <HeroPreview
                            image={image}
                            crop={crop}
                            rotated={rotated}
                            {...PHONE_FRAME}
                        />
                    )}
                </div>
            </div>
        </fieldset>
    );
}
