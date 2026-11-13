import { useRef, useState } from "react";
import { HeroMock, HeroPreview } from "../../components/HeroPhoto";
import { dragHeroCrop, heroCrop, shouldRotateOnMobile } from "../../utils/hero";

// The big frame you drag the photo in, and the smaller "how it looks elsewhere" ones.
const STAGES = {
    desktop: { label: "Laptop", width: 16, height: 9, maxWidth: 720 },
    mobile: { label: "Telefon (pionowo)", width: 9, height: 17, maxWidth: 280 },
};
const OTHER_FRAMES = {
    desktop: [{ label: "Szeroki monitor", width: 360, height: 150 }],
    mobile: [],
};

const DEVICES = [
    ["desktop", "Komputer", "heroCropDesktop"],
    ["mobile", "Telefon", "heroCropMobile"],
] as const;

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function clampZoom(value) {
    return Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)) * 100) / 100;
}

export default function HeroCropEditor({ home, update }) {
    const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
    const [imageSize, setImageSize] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    // crop while a drag is in progress: pointer events can outrun re-renders
    const drag = useRef(null);
    const field = DEVICES.find(([id]) => id === device)[2];
    const crop = heroCrop(home[field]);
    const rotated = device === "mobile" && shouldRotateOnMobile(home);
    const image =
        device === "mobile" && home.heroImageMobile ? home.heroImageMobile : home.heroImage;
    const stage = STAGES[device];

    function setCrop(next) {
        update({ [field]: next });
    }

    function moveBy(from, dx, dy, element) {
        if (!imageSize) return from;
        const box = element.getBoundingClientRect();
        return dragHeroCrop(from, { dx, dy }, { width: box.width, height: box.height }, imageSize, rotated);
    }

    function startDrag(event) {
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { crop, x: event.clientX, y: event.clientY };
        setIsDragging(true);
    }

    function continueDrag(event) {
        const state = drag.current;
        if (!state || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const next = moveBy(state.crop, event.clientX - state.x, event.clientY - state.y, event.currentTarget);
        drag.current = { crop: next, x: event.clientX, y: event.clientY };
        setCrop(next);
    }

    function endDrag() {
        drag.current = null;
        setIsDragging(false);
    }

    function onKeyDown(event) {
        const step = event.shiftKey ? 40 : 10;
        const moves = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
        };
        const move = moves[event.key];
        if (move) {
            event.preventDefault();
            setCrop(moveBy(crop, move[0], move[1], event.currentTarget));
        } else if (event.key === "+" || event.key === "=") {
            setCrop({ ...crop, zoom: clampZoom(crop.zoom + 0.1) });
        } else if (event.key === "-") {
            setCrop({ ...crop, zoom: clampZoom(crop.zoom - 0.1) });
        }
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
                Ramka pokazuje zdjęcie tak, jak będzie widoczne na stronie głównej
                {device === "desktop" ? " na komputerze" : " na telefonie"} — razem z przyciemnieniem, tytułem i
                przyciskami, które na nim leżą. <strong>Złap zdjęcie i przesuń je</strong>,
                żeby ustawić kadr, a przyciskami + i − przybliż lub oddal.
            </p>

            <div className="hero-crop-layout">
                <div className="hero-crop-picker-wrap">
                    <div
                        className={`hero-crop-stage${isDragging ? " is-dragging" : ""}`}
                        style={{ aspectRatio: `${stage.width} / ${stage.height}`, maxWidth: stage.maxWidth }}
                        role="application"
                        aria-label="Kadr zdjęcia — przesuwaj strzałkami, przybliżaj klawiszami plus i minus"
                        tabIndex={0}
                        onPointerDown={startDrag}
                        onPointerMove={continueDrag}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        onKeyDown={onKeyDown}
                    >
                        <div className={`hero-photo${rotated ? " is-rotated" : ""}`}>
                            <div
                                className="hero-photo-inner"
                                style={{
                                    backgroundImage: `url("${image}")`,
                                    backgroundPosition: `${crop.x}% ${crop.y}%`,
                                    transform: `scale(${crop.zoom})`,
                                    transformOrigin: `${crop.x}% ${crop.y}%`,
                                }}
                            />
                        </div>
                        <HeroMock title={home.heroTitle} phone={device === "mobile"} />
                        <span className="hero-crop-grab" aria-hidden="true">
                            <i className="bi bi-arrows-move" /> Przeciągnij zdjęcie
                        </span>
                        {/* only measures the photo; the frame draws it as a background */}
                        <img
                            src={image}
                            alt=""
                            hidden
                            onLoad={(event) =>
                                setImageSize({
                                    width: event.currentTarget.naturalWidth,
                                    height: event.currentTarget.naturalHeight,
                                })
                            }
                        />
                    </div>

                    <div className="hero-crop-zoom">
                        <button
                            type="button"
                            className="button-secondary"
                            aria-label="Oddal"
                            disabled={crop.zoom <= MIN_ZOOM}
                            onClick={() => setCrop({ ...crop, zoom: clampZoom(crop.zoom - 0.1) })}
                        >
                            <i className="bi bi-zoom-out" aria-hidden="true" />
                        </button>
                        <label>
                            <span className="field-label">Przybliżenie: {Math.round(crop.zoom * 100)}%</span>
                            <input
                                type="range"
                                min={MIN_ZOOM}
                                max={MAX_ZOOM}
                                step={0.05}
                                value={crop.zoom}
                                onChange={(event) => setCrop({ ...crop, zoom: Number(event.target.value) })}
                            />
                        </label>
                        <button
                            type="button"
                            className="button-secondary"
                            aria-label="Przybliż"
                            disabled={crop.zoom >= MAX_ZOOM}
                            onClick={() => setCrop({ ...crop, zoom: clampZoom(crop.zoom + 0.1) })}
                        >
                            <i className="bi bi-zoom-in" aria-hidden="true" />
                        </button>
                    </div>
                    {crop.zoom === 1 && (
                        <p className="admin-hint">
                            Bez przybliżenia zdjęcie przesuwa się tylko w tym kierunku, w którym wystaje poza ramkę.
                            Przybliż je, żeby przesuwać w obie strony.
                        </p>
                    )}
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={() => setCrop({ x: 50, y: 50, zoom: 1 })}
                    >
                        Przywróć ustawienie domyślne
                    </button>
                </div>

                {OTHER_FRAMES[device].length > 0 && (
                    <div className="hero-crop-previews">
                        <p className="admin-hint">Tak wyjdzie na innych ekranach:</p>
                        {OTHER_FRAMES[device].map((frame) => (
                            <HeroPreview
                                key={frame.label}
                                image={image}
                                crop={crop}
                                title={home.heroTitle}
                                {...frame}
                            />
                        ))}
                    </div>
                )}
            </div>
        </fieldset>
    );
}
