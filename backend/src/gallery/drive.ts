const { google } = require("googleapis");

const FOLDER_MIME = "application/vnd.google-apps.folder";

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

function hasDriveCredentials() {
    return Boolean(process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL);
}

let driveClient;

function getDrive() {
    if (driveClient) return driveClient;
    if (!hasDriveCredentials()) {
        throw new Error(
            "Brak danych konta serwisowego Google (GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_EMAIL) w backend/config/.env.",
        );
    }

    // a service-account key as a JWT client (GoogleAuth's `credentials` option is deprecated)
    const auth = new google.auth.JWT({
        email: process.env.GOOGLE_CLIENT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        keyId: process.env.GOOGLE_PRIVATE_KEY_ID || undefined,
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    driveClient = google.drive({ version: "v3", auth });
    return driveClient;
}

async function listChildren(folderId, mimeFilter) {
    const files = [];
    let pageToken;

    do {
        const response = await getDrive().files.list({
            q: `'${folderId}' in parents and trashed = false and ${mimeFilter}`,
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

function listImages(folderId) {
    return listChildren(folderId, "mimeType contains 'image/'");
}

async function getFolder(folderId) {
    try {
        const response = await getDrive().files.get({
            fileId: folderId,
            fields: "id, name, mimeType",
            supportsAllDrives: true,
        });
        if (response.data.mimeType !== FOLDER_MIME) {
            throw new Error("To nie jest folder Dysku Google.");
        }
        return response.data;
    } catch (error) {
        if (error?.response?.status === 404 || error?.code === 404) {
            throw new Error(
                `Brak dostępu do folderu. Udostępnij go kontu ${process.env.GOOGLE_CLIENT_EMAIL || "serwisowemu"} (Przeglądający).`,
            );
        }
        throw error;
    }
}

async function downloadFile(fileId) {
    const response = await getDrive().files.get(
        { fileId, alt: "media", supportsAllDrives: true },
        { responseType: "arraybuffer" },
    );
    return Buffer.from(response.data);
}

module.exports = {
    parseFolderId,
    hasDriveCredentials,
    listImages,
    getFolder,
    downloadFile,
};
