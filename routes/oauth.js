import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Resolve frontend redirect URL at runtime
const getClientUrl = () => {
    const allowedDomains = ["https://www.selamy.me", "http://localhost:5173"];
    if (process.env.CLIENT_URL && allowedDomains.includes(process.env.CLIENT_URL)) {
        return process.env.CLIENT_URL;
    }
    if (process.env.NODE_ENV === 'production') {
        return "https://www.selamy.me"; // Fallback to production URL if env is missing
    }
    return "http://localhost:5173";
};

// Redirect to frontend login on error
const redirectWithError = (res, errorMsg) => {
    return res.redirect(`${getClientUrl()}/login?error=${encodeURIComponent(errorMsg)}`);
};

// Generate system JWT and redirect to transit page on successful login
const handleSuccessfulAuth = (req, res) => {
    try {
        const user = req.user; // Authenticated user object from Passport.js
        if (!user) {
            return redirectWithError(res, "Authentication failed. User not found.");
        }

        // Generate custom system JWT
        const token = jwt.sign(
            { userID: user._id, username: user.username, jti: uuidv4() },
            process.env.JWT_SECRET,
            { expiresIn: "3d" }
        );

        // Redirect to transit page (token will be grabbed by React from URL)
        res.redirect(`${getClientUrl()}/oauth-callback?token=${token}`);
    } catch (error) {
        console.error(error);
        redirectWithError(res, "Internal server error during OAuth generation.");
    }
};

// ======================= GOOGLE ROUTES =======================

// 1. Redirect to Google
router.get("/google", passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false // Disable session since we use transit page architecture
}));

// 2. Google Callback route
router.get("/google/callback", (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
        // Redirect to frontend on error
        if (err) return redirectWithError(res, err.message || "Google login process failed.");
        if (!user) return redirectWithError(res, "Google user could not be retrieved.");
        
        // Handle successful authentication
        req.user = user;
        handleSuccessfulAuth(req, res);
    })(req, res, next);
});

// ======================= GITHUB ROUTES =======================

// 1. Redirect to GitHub
router.get("/github", passport.authenticate("github", {
    scope: ["user:email"], // Request email scope
    session: false
}));

// 2. GitHub Callback route
router.get("/github/callback", (req, res, next) => {
    passport.authenticate("github", { session: false }, (err, user, info) => {
        if (err) return redirectWithError(res, err.message || "GitHub login process failed.");
        if (!user) return redirectWithError(res, "GitHub user could not be retrieved.");
        
        req.user = user;
        handleSuccessfulAuth(req, res);
    })(req, res, next);
});

export default router;
