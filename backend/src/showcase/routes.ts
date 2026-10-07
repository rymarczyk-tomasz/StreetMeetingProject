const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const path = require("path");

const submissionsDb = require("../db/submissions");
const siteContentDb = require("../db/siteContent");
const { diskPathOf } = require("../utils/userPhotos");
const { SHOWCASE_UPLOAD_ROOT } = require("../utils/paths");
const { getSharp } = require("../utils/sharp");

const router = express.Router();

const WIDTHS = [480, 1200];
const MAX_PHOTOS_PER_CAR = 5;

function isEnabled() {
    return Boolean(siteContentDb.getSettings().showcaseEnabled);
}

function photosOf(row) {
    return JSON.parse(row.photos || "[]").slice(0, MAX_PHOTOS_PER_CAR);
}

function photoVersion(storedPath) {
    return crypto.createHash("sha1").update(String(storedPath)).digest("hex").slice(0, 12);
}

router.get("/", (req, res) => {
    const edition = siteContentDb.getCurrentEdition();
    if (!isEnabled()) return res.json({ enabled: false, edition, cars: [] });

    const cars = submissionsDb.listShowcase(edition).map((row) => ({
        id: row.id,
        carBrand: row.car_brand,
        photos: photosOf(row).map((stored, index) => {
            const base = `/api/showcase/photos/${row.id}/${index}`;
            const v = photoVersion(stored);
            return { thumb: `${base}?w=480&v=${v}`, full: `${base}?w=1200&v=${v}` };
        }),
    }));
    res.set("Cache-Control", "public, max-age=300");
    res.json({ enabled: true, edition, cars });
});

async function renderCopy(source, target, width) {
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    const temp = `${target}.${crypto.randomBytes(6).toString("hex")}.tmp`;
    // rotate() applies EXIF orientation; the copy carries no EXIF (GPS etc.).
    await getSharp()(source)
        .rotate()
        .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
        .webp({ quality: width > 600 ? 80 : 72 })
        .toFile(temp);
    await fs.promises.rename(temp, target);
}

router.get("/photos/:id/:index", async (req, res) => {
    const row = submissionsDb.findSubmissionById(Number(req.params.id));
    if (!isEnabled() || !submissionsDb.isInShowcase(row, siteContentDb.getCurrentEdition())) {
        return res.status(404).end();
    }

    const stored = photosOf(row)[Number(req.params.index)];
    const source = stored && diskPathOf(stored);
    const width = WIDTHS.includes(Number(req.query.w)) ? Number(req.query.w) : WIDTHS[0];
    if (!source) return res.status(404).end();

    const target = path.join(SHOWCASE_UPLOAD_ROOT, `${row.id}-${photoVersion(stored)}-${width}.webp`);
    try {
        if (!fs.existsSync(target)) await renderCopy(source, target, width);
    } catch (error) {
        console.error(`[showcase] Zdjęcie zgłoszenia ${row.id}:`, error.message);
        return res.status(404).end();
    }

    // Short: hiding a car or a withdrawn consent should take effect soon.
    res.set("Cache-Control", "public, max-age=3600");
    res.sendFile(target, { dotfiles: "deny" }, (error) => {
        if (error && !res.headersSent) res.status(404).end();
    });
});

function removeShowcaseCopies(submissionId) {
    const prefix = `${Number(submissionId)}-`;
    fs.promises
        .readdir(SHOWCASE_UPLOAD_ROOT)
        .then((names) =>
            Promise.all(
                names
                    .filter((name) => name.startsWith(prefix))
                    .map((name) => fs.promises.unlink(path.join(SHOWCASE_UPLOAD_ROOT, name))),
            ),
        )
        .catch(() => {});
}

module.exports = { router, removeShowcaseCopies };
