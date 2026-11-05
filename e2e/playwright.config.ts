import { defineConfig, devices } from "@playwright/test";
import config from "./config.cjs";

const { API_PORT, FRONT_PORT } = config;

export default defineConfig({
    testDir: "./tests",
    // one shared database, so scenarios run one after another
    workers: 1,
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
    use: {
        baseURL: `http://localhost:${FRONT_PORT}`,
        locale: "pl-PL",
        timezoneId: "Europe/Warsaw",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"] } },
        { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /smoke/ },
    ],
    webServer: [
        {
            command: "node start-backend.cjs",
            url: `http://localhost:${API_PORT}/api/health`,
            reuseExistingServer: false,
            stdout: "pipe",
        },
        {
            command: `npm run dev -- --port ${FRONT_PORT} --strictPort`,
            cwd: "../frontend",
            url: `http://localhost:${FRONT_PORT}`,
            env: { API_TARGET: `http://localhost:${API_PORT}` },
            reuseExistingServer: false,
        },
    ],
});
