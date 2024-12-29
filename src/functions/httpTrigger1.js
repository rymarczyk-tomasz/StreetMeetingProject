// filepath: /d:/Projekty/SM/StreetMeetingProject/src/functions/httpTrigger1.js
const { app } = require("@azure/functions");
require("dotenv").config();

app.http("httpTrigger1", {
    methods: ["GET", "POST"],
    authLevel: "anonymous",
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);

        const name =
            request.query.get("name") || (await request.text()) || "world";

        // Przykład użycia zmiennych środowiskowych
        const exampleSecret = process.env.EXAMPLE_SECRET;

        return { body: `Hello, ${name}! Secret: ${exampleSecret}` };
    },
});
