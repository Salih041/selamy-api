import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Frontend'in yönleneceği adres (Örn: http://localhost:5173)
// .env'den alıyoruz, yoksa varsayılan local adresi kullanıyoruz
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Hata durumunda frontend'in logine yönlendirme
const redirectWithError = (res, errorMsg) => {
    return res.redirect(`${CLIENT_URL}/login?error=${encodeURIComponent(errorMsg)}`);
};

// Başarılı girişte sistem JWT'sini üretip Transit sayfasına yönlendirme
const handleSuccessfulAuth = (req, res) => {
    try {
        const user = req.user; // Passport.js'den gelen başarıyla doğrulanmış/kayıt olmuş kullanıcı objesi
        if (!user) {
            return redirectWithError(res, "Authentication failed. User not found.");
        }

        // Kendi sistem JWT'mizi üretiyoruz
        const token = jwt.sign(
            { userID: user._id, username: user.username, jti: uuidv4() },
            process.env.JWT_SECRET,
            { expiresIn: "3d" }
        );

        // Transit sayfasına yönlendir (token sadece URL'de bir anlık görünüp React tarafından alınacak)
        res.redirect(`${CLIENT_URL}/oauth-callback?token=${token}`);
    } catch (error) {
        console.error(error);
        redirectWithError(res, "Internal server error during OAuth generation.");
    }
};

// ======================= GOOGLE ROTALARI =======================

// 1. Google'a yönlendirme rotası
router.get("/google", passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false // Transit Page mimarisini kullandığımız için session iptal
}));

// 2. Google'dan dönüş (Callback) rotası
router.get("/google/callback", (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
        // Hata durumunda frontend'e yönlendiriyoruz
        if (err) return redirectWithError(res, err.message || "Google login process failed.");
        if (!user) return redirectWithError(res, "Google user could not be retrieved.");
        
        // Başarılıysa özel fonksiyonumuza gönderiyoruz
        req.user = user;
        handleSuccessfulAuth(req, res);
    })(req, res, next);
});

// ======================= GITHUB ROTALARI =======================

// 1. GitHub'a yönlendirme rotası
router.get("/github", passport.authenticate("github", {
    scope: ["user:email"], // Sadece email okumak istediğimizi belirtiyoruz
    session: false
}));

// 2. GitHub'dan dönüş (Callback) rotası
router.get("/github/callback", (req, res, next) => {
    passport.authenticate("github", { session: false }, (err, user, info) => {
        if (err) return redirectWithError(res, err.message || "GitHub login process failed.");
        if (!user) return redirectWithError(res, "GitHub user could not be retrieved.");
        
        req.user = user;
        handleSuccessfulAuth(req, res);
    })(req, res, next);
});

export default router;
