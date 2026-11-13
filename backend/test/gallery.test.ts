// Gallery = the photos of one Google Drive folder (no albums). Drive is faked.
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { api, createUser, db } = require("./helpers");
const drive = require("../src/gallery/drive");
const galleryDb = require("../src/db/gallery");
const { GALLERY_UPLOAD_ROOT } = require("../src/utils/paths");

const FOLDER_A = "FOLDER_A_1234567890";
const FOLDER_B = "FOLDER_B_1234567890";
const folderLink = (id) => `https://drive.google.com/drive/folders/${id}?usp=sharing`;

const driveFiles = {
    [FOLDER_A]: [
        { id: "a1", name: "IMG_1.jpg", modifiedTime: "2027-01-01", md5Checksum: "m1", size: "100" },
        { id: "a2", name: "IMG_2.jpg", modifiedTime: "2027-01-01", md5Checksum: "m2", size: "100" },
    ],
    [FOLDER_B]: [{ id: "b1", name: "Inne.jpg", modifiedTime: "2027-02-01", md5Checksum: "m3", size: "100" }],
};
const folderNames = { [FOLDER_A]: "Street Show 2027", [FOLDER_B]: "Inny folder" };
const requested = [];

drive.hasDriveCredentials = () => true;
drive.getFolder = async (id) => {
    if (!folderNames[id]) throw new Error("Brak dostępu do folderu.");
    return { id, name: folderNames[id] };
};
drive.listImages = async (id) => {
    requested.push(id);
    return driveFiles[id] || [];
};
drive.downloadFile = async () =>
    sharp({ create: { width: 40, height: 30, channels: 3, background: "#c00" } }).jpeg().toBuffer();

async function waitForSync(client) {
    for (let i = 0; i < 100; i += 1) {
        const { body } = await client.get("/api/admin/gallery/sync-status");
        if (!body.sync.inProgress) return body.sync;
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("synchronizacja nie skończyła się");
}

describe("galeria z jednego folderu", () => {
    test("bez wskazanego folderu galeria jest pusta, a panel pokazuje brak folderu", async () => {
        const admin = createUser({ role: "admin" });
        const client = api(admin);

        assert.deepEqual((await api().get("/api/gallery")).body.photos, []);
        const panel = (await client.get("/api/admin/gallery")).body;
        assert.equal(panel.folder, null);
        assert.equal((await client.post("/api/admin/gallery/sync")).status, 400);
    });

    test("tylko admin zarządza galerią, publicznie widać zdjęcia", async () => {
        const user = createUser();
        for (const [method, url] of [
            ["get", "/api/admin/gallery"],
            ["put", "/api/admin/gallery/folder"],
            ["post", "/api/admin/gallery/sync"],
            ["patch", "/api/admin/gallery/photos/1"],
        ]) {
            assert.equal((await api(user)[method](url).send({})).status, 403, `${method} ${url}`);
            assert.equal((await api()[method](url).send({})).status, 401, `anon ${method} ${url}`);
        }
        assert.equal((await api().get("/api/gallery")).status, 200);
    });

    test("wskazanie folderu pobiera zdjęcia, ukryte nie są publiczne, inny folder zastępuje poprzedni", async () => {
        const admin = createUser({ role: "admin" });
        const client = api(admin);

        const bad = await client.put("/api/admin/gallery/folder").send({ driveUrl: "to nie jest link" });
        assert.equal(bad.status, 400);
        const noAccess = await client.put("/api/admin/gallery/folder").send({ driveUrl: folderLink("NO_ACCESS_1234567") });
        assert.equal(noAccess.status, 400);
        assert.match(noAccess.body.message, /Brak dostępu/);

        const set = await client.put("/api/admin/gallery/folder").send({ driveUrl: folderLink(FOLDER_A) });
        assert.equal(set.status, 200, set.body.message);
        assert.equal(set.body.folder.name, "Street Show 2027");
        await waitForSync(client);

        const panel = (await client.get("/api/admin/gallery")).body;
        assert.equal(panel.folder.totalPhotoCount, 2);
        assert.deepEqual(panel.photos.map((photo) => photo.name), ["IMG_1.jpg", "IMG_2.jpg"]);
        assert.equal((await api().get("/api/gallery")).body.photos.length, 2);
        const albumDir = path.join(GALLERY_UPLOAD_ROOT, String(galleryDb.getGalleryFolder().id));
        assert.ok(fs.readdirSync(albumDir).some((file) => file.endsWith("-480.webp")));

        // hidden photos are only in the panel
        const hidden = panel.photos[0];
        assert.equal((await client.patch(`/api/admin/gallery/photos/${hidden.id}`).send({ isHidden: true })).status, 200);
        const publicPhotos = (await api().get("/api/gallery")).body.photos;
        assert.deepEqual(publicPhotos.map((photo) => photo.name), ["IMG_2.jpg"]);
        assert.equal((await client.get("/api/admin/gallery")).body.photos.length, 2);

        // the same folder again keeps what was hidden
        const again = await client.put("/api/admin/gallery/folder").send({ driveUrl: folderLink(FOLDER_A) });
        assert.equal(again.status, 200);
        await waitForSync(client);
        assert.equal((await api().get("/api/gallery")).body.photos.length, 1);

        // another folder replaces the photos and removes the old files
        const oldDir = albumDir;
        const other = await client.put("/api/admin/gallery/folder").send({ driveUrl: FOLDER_B });
        assert.equal(other.status, 200, other.body.message);
        await waitForSync(client);
        assert.deepEqual((await api().get("/api/gallery")).body.photos.map((photo) => photo.name), ["Inne.jpg"]);
        assert.equal((await client.get("/api/admin/gallery")).body.folder.name, "Inny folder");
        assert.equal(fs.existsSync(oldDir), false);
        assert.equal(galleryDb.listAlbums().length, 1);

        // only the chosen folder's own images are listed, never subfolders
        assert.ok(requested.every((id) => [FOLDER_A, FOLDER_B].includes(id)));
    });

    test("stare albumy: zostaje najnowszy, reszta znika razem ze zdjęciami", () => {
        db.prepare("DELETE FROM gallery_albums").run();
        const insert = db.prepare("INSERT INTO gallery_albums (title, drive_folder_id, sort_order) VALUES (?, ?, ?)");
        const photo = db.prepare(
            "INSERT INTO gallery_photos (album_id, drive_file_id, name, signature, version) VALUES (?, ?, 'x', 's', 'v')",
        );
        const archive = insert.run("Archiwum", "ARCHIVE_FOLDER_1234", 0).lastInsertRowid;
        const newest = insert.run("StreetShow2026", "NEWEST_FOLDER_12345", -1).lastInsertRowid;
        photo.run(archive, "p1");
        photo.run(newest, "p2");

        galleryDb.keepOnlyNewestAlbum();

        assert.deepEqual(galleryDb.listAlbums().map((album) => album.title), ["StreetShow2026"]);
        assert.equal(db.prepare("SELECT COUNT(*) AS n FROM gallery_photos").get().n, 1);
    });
});
