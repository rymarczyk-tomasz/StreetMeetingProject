// where an approved car stands at the event (key "murawa" = the ring around the pitch)
export const ZONES: [string, string][] = [
    ["murawa", "Otok murawy"],
    ["tunel", "Tunel"],
    ["korona", "Korona"],
];

export const ZONE_LABELS: Record<string, string> = Object.fromEntries(ZONES);
