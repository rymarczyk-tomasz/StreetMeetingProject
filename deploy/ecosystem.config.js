// PM2 process for the API. cwd must be backend/ - the app reads config/.env and
// uploads/ relative to process.cwd().
const path = require("path");

module.exports = {
    apps: [
        {
            name: "streetshow-api",
            cwd: path.join(__dirname, "../backend"),
            script: "dist/server.js",
            max_memory_restart: "600M",
            time: true,
        },
    ],
};
