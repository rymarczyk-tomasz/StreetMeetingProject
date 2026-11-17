// where an approved car is placed at the event
const ZONES = { murawa: "Murawa", tunel: "Tunel", korona: "Korona" };

function isZone(value) {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(ZONES, value);
}

function zoneLabel(value) {
    return isZone(value) ? ZONES[value] : "";
}

module.exports = { ZONES, isZone, zoneLabel };
