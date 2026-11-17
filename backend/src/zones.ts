// where an approved car is placed at the event; the key "murawa" stays for stored rows,
// the cars stand on the ring around the pitch, never on the pitch itself
const ZONES = { murawa: "Otok murawy", tunel: "Tunel", korona: "Korona" };

function isZone(value) {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(ZONES, value);
}

function zoneLabel(value) {
    return isZone(value) ? ZONES[value] : "";
}

module.exports = { ZONES, isZone, zoneLabel };
