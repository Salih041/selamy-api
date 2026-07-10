import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {redis} from "../config/redis.js";
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import sendEmail from "../utils/email.js";
import { authEmailLimiter, authIpLimiter, authUsernameLimiter, userReadLimiter } from "../middlewares/limiters.js";
import crypto from "crypto";
import ExpressMongoSanitize from "express-mongo-sanitize";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", authIpLimiter, [
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

            const existingUser = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] });

            if (existingUser && existingUser.isBanned) return res.status(403).json({ message: "This account has been banned." });

            if (existingUser) {
                return res.status(400).json({ message: "This username or email is already taken" });
            }

            const hashedPassword = await bcrypt.hash(password, 12);

            // verify
            const verificationCode = crypto.randomInt(100000, 999999).toString();

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

            res.status(201).json({ message: "User created successfully", userId: savedUser._id });
        } catch (error) {
            if (error.code === 11100) return res.status(400).json({ message: "There is already a user with this informations." });
            console.error(error)
            res.status(500).json({ message: "Internal Server Error" })
        }
    })

// verify route
router.post("/verify-email", authEmailLimiter, async (req, res) => {
    try {
        const { email, code } = ExpressMongoSanitize.sanitize(req.body);

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
        console.error(error)
        res.status(500).json({ message: "Internal Server Error" })
    }
})


router.post("/login", authUsernameLimiter,
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

            if (user.isBanned) {
                return res.status(403).json({ message: "Your account has been banned." });
            }

            const token = jwt.sign(
                { userID: user._id, username: user.username, jti: uuidv4()},
                process.env.JWT_SECRET,
                { expiresIn: "3d" }
            )

            res.status(200).json({ token, userID: user._id, role: user.role });
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Internal Server Error" })
        }
    })

router.post("/logout", authMiddleware, async(req,res)=>{
    try{
        const authHeader = req.headers.authorization;
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);

        if(ttl > 0){
            await redis.set(`bl:${decoded.jti}`,"1","EX",ttl);
        }
        res.status(200).json({ message: "Logged out successfully." });
    }catch(error){
        console.error(error)
        res.status(500).json({ message: "Internal Server Error" })
    }
})

router.post("/forgot-password", authEmailLimiter, async (req, res) => {
    try {
        const { email } = ExpressMongoSanitize.sanitize(req.body);
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(200).json({
                message: "The reset code has been sent to your email address.",
                email: email
            });
        }
        const resetCode = crypto.randomInt(100000, 999999).toString();

        user.resetPasswordToken = resetCode;
        user.resetPasswordExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour
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
            res.status(200).json({ message: "The reset code has been sent to your email address." });
        } catch (emailError) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            console.error(emailError)
            return res.status(500).json({ message: "Mail couldnt be sent." });
        }
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Internal Server Error" })
    }
})

router.post("/reset-password", authEmailLimiter, [
    body("newPassword").isLength({ min: 6, max: 72 }).withMessage("Password must be between 6-72 characters").matches(/\d/).withMessage("Password must contain at least one number").matches(/[a-z]/).withMessage("Password must contain at least one letter").matches(/[A-Z]/).withMessage("Password must contain at least one capital letter"),
    body("code").notEmpty().withMessage("Code is required").isString().withMessage("Invalid code format")
],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
        try {
            const { email, code, newPassword } = ExpressMongoSanitize.sanitize(req.body);
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
            console.error(error)
            res.status(500).json({ message: "Internal Server Error" })
        }
    })

router.get("/me", authMiddleware, userReadLimiter, async (req, res) => {
    try {
        const user = await User.findById(req.user.userID).select('_id username role profilePicture');
        if (!user) return res.status(404).json({ message: "User not found" });
        return res.status(200).json(user);
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Internal Server Error" })
    }
})

export default router;