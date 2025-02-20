import dotenv from "dotenv";
import { GoogleAuth } from "google-auth-library";
import * as google from "googleapis";
import fs from "fs";

export class GoogleService {
    auth;
    credentials;
    sheets;
    drive;
    SPREADSHEET_ID;
    GOOGLE_DRIVE_FOLDER_ID;

    constructor(envPath) {
        dotenv.config({ path: envPath });

        this.credentials = {
            type: "service_account",
            project_id: process.env.GOOGLE_PROJECT_ID,
            private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
            private_key: process.env.GOOGLE_PRIVATE_KEY
                ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
                : null,
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            client_id: process.env.GOOGLE_CLIENT_ID,
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
            universe_domain: "googleapis.com",
        };

        this.auth = new GoogleAuth({
            credentials: this.credentials,
            scopes: [
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive",
            ],
        });

        this.sheets = new google.sheets_v4.Sheets({ auth: this.auth });
        this.drive = new google.drive_v3.Drive({ auth: this.auth });
        this.SPREADSHEET_ID = process.env.SPREADSHEET_ID;
        this.GOOGLE_DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;
    }

    async appendToSheet(data) {
        return await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.SPREADSHEET_ID,
            range: "Arkusz1!A:H",
            valueInputOption: "RAW",
            resource: {
                values: [
                    [
                        data.firstName,
                        data.lastName,
                        data.email,
                        data.phone,
                        data.licensePlate,
                        data.carBrand,
                        data.carDescription,
                        data.photoUrls,
                    ],
                ],
            },
        }).then((response) => {
            return response.data;
        }).catch((error) => {
            console.error("Error appending to sheet: ", error);
        });
    }

    async createUserFolder(firstName, lastName) {
        const folderName = `${firstName} ${lastName}`;
        const folderMetadata = {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [this.GOOGLE_DRIVE_FOLDER_ID], // Folder główny w Google Drive
        };

        const folder = await this.drive.files.create({
            resource: folderMetadata,
            fields: "id, webViewLink",
        });

        return { id: folder.data.id, link: folder.data.webViewLink };
    }

    async uploadFilesToDrive(files, userFolderId) {
        const fileLinks = [];

        for (const file of files) {
            const uploadedFile = await this.drive.files.create({
                resource: {
                    name: file.originalname,
                    parents: [userFolderId], // Wysyłamy plik do folderu użytkownika
                },
                media: {
                    mimeType: file.mimetype,
                    body: fs.createReadStream(file.path),
                },
                fields: "id, webViewLink",
            });

            fileLinks.push(uploadedFile.data.webViewLink);
        }
        return fileLinks;
    }
}
