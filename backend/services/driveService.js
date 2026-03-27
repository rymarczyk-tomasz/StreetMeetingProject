import fs from "fs";
import { drive } from "../config/google.js";

async function createFolderOnDrive(name, parentId) {
    const folder = await drive.files.create({
        resource: {
            name,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentId],
        },
        fields: "id, webViewLink",
    });

    return folder.data;
}

async function uploadFileToDrive(file, folderId) {
    const uploaded = await drive.files.create({
        resource: {
            name: file.originalname,
            parents: [folderId],
        },
        media: {
            mimeType: file.mimetype,
            body: fs.createReadStream(file.path),
        },
        fields: "id, webViewLink",
    });

    return uploaded.data.webViewLink;
}

export { createFolderOnDrive, uploadFileToDrive };
