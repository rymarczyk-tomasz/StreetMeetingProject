const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_DAYS = 30;

function getAccessSecret() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        throw new Error("JWT_ACCESS_SECRET is not defined");
    }
    return secret;
}

function getRefreshSecret() {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
        throw new Error("JWT_REFRESH_SECRET is not defined");
    }
    return secret;
}

function signAccessToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        getAccessSecret(),
        { expiresIn: ACCESS_TOKEN_TTL },
    );
}

function signRefreshToken(user) {
    return jwt.sign({ sub: user.id }, getRefreshSecret(), {
        expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d`,
    });
}

function verifyAccessToken(token) {
    return jwt.verify(token, getAccessSecret());
}

function verifyRefreshToken(token) {
    return jwt.verify(token, getRefreshSecret());
}

function getRefreshTokenExpiryDate() {
    const expires = new Date();
    expires.setDate(expires.getDate() + REFRESH_TOKEN_TTL_DAYS);
    return expires;
}

const cookieBaseOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
};

function setAuthCookies(res, { accessToken, refreshToken }) {
    res.cookie("access_token", accessToken, {
        ...cookieBaseOptions,
        maxAge: 15 * 60 * 1000,
    });
    res.cookie("refresh_token", refreshToken, {
        ...cookieBaseOptions,
        maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
        path: "/api/auth",
    });
}

function clearAuthCookies(res) {
    res.clearCookie("access_token", cookieBaseOptions);
    res.clearCookie("refresh_token", {
        ...cookieBaseOptions,
        path: "/api/auth",
    });
}

module.exports = {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    getRefreshTokenExpiryDate,
    setAuthCookies,
    clearAuthCookies,
    REFRESH_TOKEN_TTL_DAYS,
};
