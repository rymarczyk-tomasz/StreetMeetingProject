const isLocalDevelopment =
    window.location.protocol === "file:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

window.ENV = {
    API_BASE_URL: isLocalDevelopment
        ? "http://localhost:33000/upload"
        : "https://streetmeetingbackend.azurewebsites.net/upload",
};
