import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import sendEmail from "../utils/email.js";
import rateLimit from "express-rate-limit";
import { registerLimiter, loginLimiter, resetPasswordLimiter } from "../middlewares/limiters.js";

const router = express.Router();
const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: { message: "Too many requests. Please try again after 15 minutes." }
});

router.post("/register", registerLimiter ,[
    body("username").trim().notEmpty().withMessage("Username is required").isLength({ min: 3, max: 20 }).withMessage("Username must be between 3-20 characters").matches(/^[a-zA-Z0-9_]+$/).withMessage("Username can only contain only letters,numbers and underscore"),
    body("email").trim().isEmail().withMessage("Invalid Email").normalizeEmail(),
    body("password").isLength({ min: 6, max: 72 }).withMessage("Password must be between 6-72 characters").matches(/\d/).withMessage("Password must contain at least one number").matches(/[a-z]/).withMessage("Password must contain at least one letter").matches(/[A-Z]/).withMessage("Password must contain at least one capital letter")
],
    async (req, res) => {
        try {

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ message: errors.array()[0].msg });
            }

            const { username, email, password } = req.body;

            const existingUser = await User.findOne({ $or: [{ username: username }, { email: email }] });
            if (existingUser) {
                return res.status(400).json({ message: "This username or email is already taken" });
            }

            const hashedPassword = await bcrypt.hash(password, 12);

            // verify
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

            const newUser = new User({
                username,
                email,
                displayName: username,
                password: hashedPassword,
                isVerified: false,
                verificationToken: verificationCode,
                verificationTokenExpires: Date.now() + 1 * 60 * 60 * 1000 // 1h
            })

            const savedUser = await newUser.save();

            //verify send email
            const message = `
                <div style="font-family: Arial; text-align: center; padding: 20px;">
                    <h2>Welcome to SelamY!</h2>
                    <p>Enter the code below to verify your account:</p>
                    <h1 style="color: #4a90e2; letter-spacing: 5px;">${verificationCode}</h1>
                </div>
            `;
            try {
                await sendEmail({
                    email: newUser.email,
                    subject: "Your Selamy Verification Code:",
                    html: message
                });
            } catch (emailError) {
                await User.findByIdAndDelete(newUser._id);
                return res.status(500).json({ message: "Mail couldnt be sent." });
            }

            res.status(201).json({ message: "Kullanıcı oluşturuldu", userId: savedUser._id });
        } catch (error) {
            if (error.code === 11100) return res.status(400).json({ message: "There is already a user with this informations." });
            res.status(500).json({ error: error.message });
        }
    })

// verify route
router.post("/verify-email", async (req, res) => {
    try {
        const { email, code } = req.body;

        const user = await User.findOne({
            email: email,
            verificationToken: code,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired code" });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        res.status(200).json({ message: "Account verified! You can log in!" });

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})


router.post("/login",loginLimiter,
    [
        body("username").notEmpty().withMessage("Username is required"),
        body("password").notEmpty().withMessage("Password is required")
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ message: errors.array()[0].msg });
            }

            const { username, password } = req.body;
            const user = await User.findOne({ username: username.toLowerCase() });
            if (!user) return res.status(404).json({ message: "Invalid username or password" });

            const isPasswordCorrect = await bcrypt.compare(password, user.password);
            if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid username or password" });

            //verify control
            if (!user.isVerified) {
                return res.status(403).json({ message: "Please verify your email first." });
            }

            const token = jwt.sign(
                { userID: user._id, username: user.username },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            )

            res.status(200).json({ token, userID: user._id, role: user.role });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    })

router.post("/forgot-password",resetPasswordLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(200).json({
                message: "The reset code has been sent to your email address.",
                email: email
            });
        }
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

        user.resetPasswordToken = resetCode;
        user.resetPasswordExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 Saat geçerli
        await user.save();

        const message = `
            <div style="font-family: Arial; text-align: center; padding: 20px;">
                <h2>Password Reset Request</h2>
                <p>Use the code below to reset your password:</p>
                <h1 style="color: #e74c3c; letter-spacing: 5px;">${resetCode}</h1>
                <p>This code is valid for 1 hour.</p>
                <p>If you did not make this request, ignore this email.</p>
            </div>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: "Password Reset Code",
                html: message
            })
            res.status(200).json({ message: "The reset code has been sent to your email address."});
        } catch (emailError) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            return res.status(500).json({ message: "Mail couldnt be sent." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.post("/reset-password", [
    body("newPassword").isLength({ min: 6, max: 72 }).withMessage("Password must be between 6-72 characters").matches(/\d/).withMessage("Password must contain at least one number").matches(/[a-z]/).withMessage("Password must contain at least one letter").matches(/[A-Z]/).withMessage("Password must contain at least one capital letter")
],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
        try {
            const { email, code, newPassword } = req.body;
            const user = await User.findOne({
                email: email,
                resetPasswordToken: code,
                resetPasswordExpires: { $gt: Date.now() }
            });
            if (!user) {
                return res.status(400).json({ message: "Invalid or expired code" });
            }
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            user.password = hashedPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            res.status(200).json({ message: "Your password has been changed successfully! You can log in." });
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    })

export default router;