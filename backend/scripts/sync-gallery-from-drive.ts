const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const dotenv = require("dotenv");

dotenv.config({
    path: path.join(__dirname, "../config/.env"),
});

const rootDir = path.resolve(__dirname, "../..");
const galleryDir = path.join(rootDir, "img", "gallery");
const syncStatePath = path.join(galleryDir, ".drive-sync-state.json");

function parseFolderId(value) {
    if (!value) return null;

    const trimmed = String(value).trim();
    const fromFolderUrl = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (fromFolderUrl) return fromFolderUrl[1];

    const fromQuery = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fromQuery) return fromQuery[1];

    if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;

    return null;
}

function getCredentialsFromEnv() {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
        ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : null;

    if (!privateKey) {
        throw new Error("Brak GOOGLE_PRIVATE_KEY w backend/config/.env");
    }

    return {
        type: "service_account",
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: privateKey,
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
            "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
    };
}

async function ensureDir(dirPath) {
    await fs.promises.mkdir(dirPath, { recursive: true });
}

async function loadSyncState() {
    try {
        const raw = await fs.promises.readFile(syncStatePath, "utf8");
        const parsed = JSON.parse(raw);

        if (
            !parsed ||
            typeof parsed !== "object" ||
            !parsed.files ||
            typeof parsed.files !== "object"
        ) {
            return { files: {} };
        }

        return parsed;
    } catch (error) {
        return { files: {} };
    }
}

async function writeSyncState(folderId, files) {
    const state = {
        folderId,
        syncedAt: new Date().toISOString(),
        files,
    };

    await fs.promises.writeFile(
        syncStatePath,
        `${JSON.stringify(state, null, 2)}\n`,
        "utf8",
    );
}

async function listDriveImages(drive, folderId) {
    const files = [];
    let pageToken;

    do {
        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`,
            fields: "nextPageToken, files(id, name, mimeType, modifiedTime, md5Checksum, size)",
            pageSize: 1000,
            pageToken,
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
        });

        files.push(...(response.data.files || []));
        pageToken = response.data.nextPageToken;
    } while (pageToken);

    return files.sort((a, b) =>
        a.name.localeCompare(b.name, "pl", { numeric: true }),
    );
}

function buildDriveSignature(file) {
    return `${file.modifiedTime || ""}|${file.md5Checksum || ""}|${file.size || ""}`;
}

function buildHttpImageEntry(file) {
    const id = file.id;
    const small = `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
    const medium = `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
    const large = `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
    const full = `https://drive.google.com/thumbnail?id=${id}&sz=w2000`;

    return {
        id,
        name: file.name,
        src: medium,
        modalSrc: full,
        srcset: `${small} 400w, ${medium} 800w, ${large} 1200w`,
    };
}

async function writeManifest(folderId, files) {
    const manifest = {
        source: "google-drive",
        folderId,
        generatedAt: new Date().toISOString(),
        files,
    };

    await fs.promises.writeFile(
        path.join(galleryDir, "manifest.json"),
        `${JSON.stringify(manifest, null, 2)}\n`,
        "utf8",
    );
}

async function syncGalleryFromDrive(folderInput) {
    const parsedFolderId = parseFolderId(folderInput);
    const fallbackFolderId = parseFolderId(
        process.env.GALLERY_DRIVE_FOLDER_URL ||
            process.env.GALLERY_DRIVE_FOLDER_ID,
    );
    const folderId = parsedFolderId || fallbackFolderId;

    if (!folderId) {
        throw new Error(
            'Podaj link lub ID folderu Drive: `npm run sync-gallery-drive -- "https://drive.google.com/drive/folders/..."`',
        );
    }

    const credentials = getCredentialsFromEnv();
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const drive = google.drive({ version: "v3", auth });

    await ensureDir(galleryDir);

    const driveFiles = await listDriveImages(drive, folderId);

    if (!driveFiles.length) {
        await writeManifest(folderId, []);
        await writeSyncState(folderId, {});
        return {
            folderId,
            filesCount: 0,
            downloadedCount: 0,
            skippedCount: 0,
            removedCount: 0,
        };
    }

    const previousState = await loadSyncState();
    const hasPreviousState =
        previousState.folderId === folderId &&
        Object.keys(previousState.files || {}).length > 0;

    const previousFiles = hasPreviousState ? previousState.files : {};
    const currentById = new Map(driveFiles.map((file) => [file.id, file]));
    const removedIds = Object.keys(previousFiles).filter(
        (id) => !currentById.has(id),
    );

    let downloadedCount = 0;
    let skippedCount = 0;
    let removedCount = 0;

    console.log(
        `Znaleziono ${driveFiles.length} zdjęć. Trwa synchronizacja przyrostowa...`,
    );

    for (const removedId of removedIds) {
        const previous = previousFiles[removedId];
        removedCount += 1;
        console.log(
            `[remove] ${previous?.name || removedId} -> usunięto z manifestu`,
        );
    }

    const nextStateFiles = {};
    const manifestFiles = [];

    for (let index = 0; index < driveFiles.length; index += 1) {
        const file = driveFiles[index];
        const previous = previousFiles[file.id];
        const signature = buildDriveSignature(file);
        const changed = !previous || previous.signature !== signature;

        if (changed) {
            downloadedCount += 1;
            console.log(
                `[${index + 1}/${driveFiles.length}] ${file.name} -> zaktualizowano wpis HTTP`,
            );
        } else {
            skippedCount += 1;
            console.log(
                `[${index + 1}/${driveFiles.length}] ${file.name} -> bez zmian`,
            );
        }

        nextStateFiles[file.id] = {
            id: file.id,
            name: file.name,
            signature,
            modifiedTime: file.modifiedTime || null,
            md5Checksum: file.md5Checksum || null,
            size: file.size || null,
        };
        manifestFiles.push(buildHttpImageEntry(file));
    }

    await writeManifest(folderId, manifestFiles);
    await writeSyncState(folderId, nextStateFiles);

    return {
        folderId,
        filesCount: driveFiles.length,
        downloadedCount,
        skippedCount,
        removedCount,
    };
}

module.exports = {
    syncGalleryFromDrive,
    parseFolderId,
};

if (require.main === module) {
    (async () => {
        try {
            const result = await syncGalleryFromDrive(process.argv[2]);
            console.log(
                `Gotowe: galeria została zsynchronizowana (${result.filesCount} zdjęć, pobrano/zaktualizowano ${result.downloadedCount}, bez zmian ${result.skippedCount}, usunięto ${result.removedCount}).`,
            );
        } catch (error) {
            console.error("Błąd synchronizacji galerii:", error.message);
            process.exit(1);
        }
    })();
}
