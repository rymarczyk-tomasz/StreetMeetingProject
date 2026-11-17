import { useRef, useState } from "react";
import CroppedImage from "../../components/CroppedImage";
import { dragHeroCrop, heroCrop } from "../../utils/hero";

type Frame = { label: string; ratio: string };

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function clampZoom(value: number) {
    return Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)) * 100) / 100;
}

// Drag the photo inside the first frame; the other frames show the same crop in other shapes.
export default function ImageCropField({ image, crop: savedCrop, onChange, frames }: {
    image: string;
    crop?: { x: number; y: number; zoom: number };
    onChange: (crop: { x: number; y: number; zoom: number }) => void;
    frames: Frame[];
}) {
    const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
    const drag = useRef<{ crop: ReturnType<typeof heroCrop>; x: number; y: number } | null>(null);
    const crop = heroCrop(savedCrop);
    const [main, ...others] = frames;

    function moveBy(from, dx, dy, element: HTMLElement) {
        if (!imageSize) return from;
        const box = element.getBoundingClientRect();
        return dragHeroCrop(from, { dx, dy }, { width: box.width, height: box.height }, imageSize);
    }

    function startDrag(event) {
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { crop, x: event.clientX, y: event.clientY };
    }

    function continueDrag(event) {
        const state = drag.current;
        if (!state || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const next = moveBy(state.crop, event.clientX - state.x, event.clientY - state.y, event.currentTarget);
        drag.current = { crop: next, x: event.clientX, y: event.clientY };
        onChange(next);
    }

    function onKeyDown(event) {
        const step = event.shiftKey ? 40 : 10;
        const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        const move = moves[event.key];
        if (move) {
            event.preventDefault();
            onChange(moveBy(crop, move[0], move[1], event.currentTarget));
        } else if (event.key === "+" || event.key === "=") {
            onChange({ ...crop, zoom: clampZoom(crop.zoom + 0.1) });
        } else if (event.key === "-") {
            onChange({ ...crop, zoom: clampZoom(crop.zoom - 0.1) });
        }
    }

    if (!image) return null;

    return (
        <div className="image-crop-field">
            <span className="field-label">Kadr — złap zdjęcie i przesuń</span>
            <div
                className="image-crop-stage"
                style={{ aspectRatio: main.ratio }}
                role="application"
                aria-label="Kadr zdjęcia — przesuwaj strzałkami, przybliżaj klawiszami plus i minus"
                tabIndex={0}
                onPointerDown={startDrag}
                onPointerMove={continueDrag}
                onPointerUp={() => (drag.current = null)}
                onPointerCancel={() => (drag.current = null)}
                onKeyDown={onKeyDown}
            >
                <CroppedImage
                    className="image-crop-photo"
                    crop={crop}
                    src={image}
                    alt=""
                    draggable={false}
                    onLoad={(event) =>
                        setImageSize({
                            width: event.currentTarget.naturalWidth,
                            height: event.currentTarget.naturalHeight,
                        })
                    }
                />
                <span className="image-crop-label">{main.label}</span>
            </div>
            <label className="image-crop-zoom">
                <span className="field-label">Przybliżenie: {Math.round(crop.zoom * 100)}%</span>
                <input
                    type="range"
                    min={MIN_ZOOM}
                    max={MAX_ZOOM}
                    step={0.05}
                    value={crop.zoom}
                    onChange={(event) => onChange({ ...crop, zoom: Number(event.target.value) })}
                />
            </label>
            {others.length > 0 && (
                <div className="image-crop-previews">
                    {others.map((frame) => (
                        <figure key={frame.label}>
                            <div className="image-crop-preview" style={{ aspectRatio: frame.ratio }}>
                                <CroppedImage className="image-crop-photo" crop={crop} src={image} alt="" />
                            </div>
                            <figcaption>{frame.label}</figcaption>
                        </figure>
                    ))}
                </div>
            )}
            <button type="button" className="button-secondary" onClick={() => onChange({ x: 50, y: 50, zoom: 1 })}>
                Wyśrodkuj
            </button>
        </div>
    );
}
