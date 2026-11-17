import type { ImgHTMLAttributes } from "react";
import { cropImageStyle } from "../utils/hero";
import type { HeroCrop } from "../utils/hero";

// A cover-fitted photo with the crop chosen in the panel; the wrapper sets the size and clips the zoom.
export default function CroppedImage({
    className,
    crop,
    ...img
}: { className: string; crop?: Partial<HeroCrop> } & ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <div className={`cropped-image ${className}`}>
            <img {...img} style={cropImageStyle(crop)} />
        </div>
    );
}
