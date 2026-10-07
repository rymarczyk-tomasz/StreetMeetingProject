// Licence plate badge: blue EU strip with "PL" + the number.
export default function Plate({ value, size = "md" }: { value: string; size?: "sm" | "md" | "lg" | "xl" }) {
    if (!value) return null;
    return (
        <span className={`plate plate-${size}`}>
            <span className="plate-eu" aria-hidden="true">
                PL
            </span>
            <span className="plate-number">{value}</span>
        </span>
    );
}
