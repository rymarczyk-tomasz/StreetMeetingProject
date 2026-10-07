import { useEffect, useState } from "react";
import { plural } from "../utils/plural";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export default function Countdown({ date, startTime = "" }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), MINUTE_MS);
        return () => clearInterval(timer);
    }, []);

    if (!date) return null;
    const start = new Date(`${date}T${startTime || "00:00"}:00`).getTime();
    const dayEnd = new Date(`${date}T23:59:59`).getTime();
    if (!Number.isFinite(start) || now > dayEnd) return null;

    const isToday = new Date(now).toDateString() === new Date(start).toDateString();
    let text;
    if (isToday) {
        text = "Już dziś!";
    } else {
        const left = start - now;
        const days = Math.floor(left / DAY_MS);
        const hours = Math.floor((left % DAY_MS) / (60 * MINUTE_MS));
        if (days > 0) text = `Za ${plural(days, "dzień", "dni", "dni")}${hours ? ` ${hours} godz.` : ""}`;
        else text = hours > 0 ? `Za ${hours} godz.` : "Za chwilę!";
    }

    return (
        <p className="hero-countdown" aria-live="off">
            {text}
        </p>
    );
}
