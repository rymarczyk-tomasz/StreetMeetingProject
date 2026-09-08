import axios from "axios";

const api = axios.create({
    baseURL: "/api",
    withCredentials: true,
});

// If an access token expires mid-session, try a single silent refresh then retry once.
let isRefreshing = false;
let pendingRequests = [];

function resolvePending(error) {
    pendingRequests.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve();
    });
    pendingRequests = [];
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { response, config } = error;

        if (
            !response ||
            response.status !== 401 ||
            config._retry ||
            config.url === "/auth/refresh"
        ) {
            return Promise.reject(error);
        }

        config._retry = true;

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                pendingRequests.push({ resolve, reject });
            }).then(() => api(config));
        }

        isRefreshing = true;
        try {
            await api.post("/auth/refresh");
            resolvePending(null);
            return api(config);
        } catch (refreshError) {
            resolvePending(refreshError);
            return Promise.reject(error);
        } finally {
            isRefreshing = false;
        }
    },
);

export default api;
