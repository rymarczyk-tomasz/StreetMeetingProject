import { sheets } from "../config/google.js";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

async function appendToSheet(data) {
    await sheets.spreadsheets.values.append({
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
                    data.folderUrl,
                ],
            ],
        },
    });
}

export { appendToSheet };
