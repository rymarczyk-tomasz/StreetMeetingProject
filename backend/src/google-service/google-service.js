import { GoogleAuth } from "google-auth-library";
import * as google from "googleapis";

// Wczytanie danych uwierzytelniających z zmiennych środowiskowych
const credentials = {
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

// Konfiguracja autoryzacji Google Auth
const auth = new GoogleAuth({
    credentials: credentials,
    scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ],
});

const sheets = new google.sheets_v4.Sheets({ auth: auth });
const drive = new google.drive_v3.Drive({ auth: auth });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

export async function appendToSheet(data) {
    try {
        sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
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
        });
    } catch (error) {
        console.error(
            "Błąd podczas dodawania danych do Google Sheets:",
            error.message
        );
        throw new Error("Nie udało się dodać danych do arkusza.");
    }
}

export async function createUserFolder(firstName, lastName) {
    try {
        const folderName = `${firstName} ${lastName}`;
        const folderMetadata = {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [GOOGLE_DRIVE_FOLDER_ID], // Folder główny w Google Drive
        };

        const folder = drive.files.create({
            resource: folderMetadata,
            fields: "id, webViewLink",
        });

        return { id: folder.data.id, link: folder.data.webViewLink };
    } catch (error) {
        console.error("Błąd przy tworzeniu folderu:", error);
        throw new Error("Nie udało się utworzyć folderu użytkownika.");
    }
}

export async function uploadFilesToDrive(files, userFolderId) {
    const fileLinks = [];

    for (const file of files) {
        try {
            const uploadedFile = drive.files.create({
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
        } catch (error) {
            console.error(
                `Błąd przy przesyłaniu pliku ${file.originalname}:`,
                error
            );
        } finally {
            fs.unlink(file.path, (err) => {
                if (err)
                    console.error(
                        `Błąd przy usuwaniu pliku ${file.originalname}:`,
                        err
                    );
            });
        }
    }
    return fileLinks;
}
