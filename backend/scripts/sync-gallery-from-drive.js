const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const dotenv = require("dotenv");

let sharp;
try {
    sharp = require("sharp");
} catch (error) {
    console.error(
        "Missing dependency: run `npm install` in project root to install sharp.",
    );
    process.exit(1);
}

dotenv.config({
    path: path.join(__dirname, "../config/.env"),
});

const rootDir = path.resolve(__dirname, "../..");
const galleryDir = path.join(rootDir, "img", "gallery");
const optimizedGalleryDir = path.join(rootDir, "img", "optimized", "gallery");
const sizes = [400, 800, 1200];

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

async function cleanDirFiles(dirPath) {
    await ensureDir(dirPath);
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    await Promise.all(
        entries
            .filter((entry) => entry.isFile())
            .map((entry) => fs.promises.unlink(path.join(dirPath, entry.name))),
    );
}

async function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
    });
}

async function listDriveImages(drive, folderId) {
    const files = [];
    let pageToken;

    do {
        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`,
            fields: "nextPageToken, files(id, name, mimeType)",
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

async function downloadFileBuffer(drive, fileId) {
    const response = await drive.files.get(
        {
            fileId,
            alt: "media",
            supportsAllDrives: true,
        },
        {
            responseType: "stream",
        },
    );

    return streamToBuffer(response.data);
}

async function saveOptimizedVariants(inputBuffer, baseName) {
    const baseImage = sharp(inputBuffer).rotate();

    await baseImage
        .clone()
        .webp({ quality: 82 })
        .toFile(path.join(galleryDir, `${baseName}.webp`));

    for (const width of sizes) {
        const resized = baseImage
            .clone()
            .resize({ width, withoutEnlargement: true });

        await resized
            .clone()
            .webp({ quality: 80 })
            .toFile(
                path.join(optimizedGalleryDir, `${baseName}-${width}.webp`),
            );

        await resized
            .clone()
            .avif({ quality: 50 })
            .toFile(
                path.join(optimizedGalleryDir, `${baseName}-${width}.avif`),
            );
    }
}

async function writeManifest(folderId, filesCount) {
    const manifest = {
        source: "google-drive",
        folderId,
        generatedAt: new Date().toISOString(),
        files: Array.from(
            { length: filesCount },
            (_, index) => `${index + 1}.webp`,
        ),
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

    await cleanDirFiles(galleryDir);
    await cleanDirFiles(optimizedGalleryDir);

    const driveFiles = await listDriveImages(drive, folderId);
    if (!driveFiles.length) {
        throw new Error(
            "Nie znaleziono obrazów w podanym folderze Google Drive.",
        );
    }

    console.log(
        `Znaleziono ${driveFiles.length} zdjęć. Trwa pobieranie i optymalizacja...`,
    );

    for (let index = 0; index < driveFiles.length; index += 1) {
        const file = driveFiles[index];
        const outputName = String(index + 1);

        const fileBuffer = await downloadFileBuffer(drive, file.id);
        await saveOptimizedVariants(fileBuffer, outputName);

        console.log(
            `[${index + 1}/${driveFiles.length}] ${file.name} -> ${outputName}.webp`,
        );
    }

    await writeManifest(folderId, driveFiles.length);

    return {
        folderId,
        filesCount: driveFiles.length,
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
                `Gotowe: galeria została zsynchronizowana i zoptymalizowana (${result.filesCount} zdjęć).`,
            );
        } catch (error) {
            console.error("Błąd synchronizacji galerii:", error.message);
            process.exit(1);
        }
    })();
}
