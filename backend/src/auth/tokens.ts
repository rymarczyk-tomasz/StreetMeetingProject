const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_TTL = "15m";
const VERIFY_OPTIONS = { algorithms: ["HS256"] };
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
        // ts: iat only has seconds, too coarse to tell tokens from before and after a "log out everywhere"
        { sub: user.id, email: user.email, role: user.role, ts: Date.now() },
        getAccessSecret(),
        { expiresIn: ACCESS_TOKEN_TTL },
    );
}

// jwtid - otherwise two sessions started in the same second get identical tokens
function signRefreshToken(user) {
    return jwt.sign({ sub: user.id }, getRefreshSecret(), {
        expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d`,
        jwtid: crypto.randomUUID(),
    });
}

// between password and code: own key, so it can never pass as an access token
const TWO_FACTOR_CHALLENGE_TTL = "5m";

function getChallengeSecret() {
    return `${getAccessSecret()}:two-factor-challenge`;
}

function signTwoFactorChallenge(user) {
    return jwt.sign({ sub: user.id, purpose: "2fa" }, getChallengeSecret(), {
        expiresIn: TWO_FACTOR_CHALLENGE_TTL,
    });
}

function verifyTwoFactorChallenge(token) {
    const payload = jwt.verify(String(token || ""), getChallengeSecret(), VERIFY_OPTIONS);
    if (payload.purpose !== "2fa") throw new Error("Invalid challenge");
    return payload;
}

function verifyAccessToken(token) {
    return jwt.verify(token, getAccessSecret(), VERIFY_OPTIONS);
}

function verifyRefreshToken(token) {
    return jwt.verify(token, getRefreshSecret(), VERIFY_OPTIONS);
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
    signTwoFactorChallenge,
    verifyTwoFactorChallenge,
    getRefreshTokenExpiryDate,
    setAuthCookies,
    clearAuthCookies,
    REFRESH_TOKEN_TTL_DAYS,
};
