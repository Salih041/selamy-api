import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";

const router = express.Router();

router.post("/register", [
    body("username").trim().notEmpty().withMessage("Username is required").isLength({ min: 3, max:20 }).withMessage("Username must be between 3-20 characters"),
    body("email").trim().isEmail().withMessage("Invalid Email").normalizeEmail(),
    body("password").isLength({ min: 6, max:72}).withMessage("Password must be between 6-72 characters").matches(/\d/).withMessage("Password must contain at least one number").matches(/[a-z]/).withMessage("Password must contain at least one letter").matches(/[A-Z]/).withMessage("Password must contain at least one capital letter")
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

            const newUser = new User({
                username,
                email,
                password: hashedPassword
            })

            const savedUser = await newUser.save();
            res.status(201).json({ message: "Kullanıcı oluşturuldu", userId: savedUser._id });
        } catch (error) {
            if (error.code === 11100) return res.status(400).json({ message: "There is already a user with this informations." });
            res.status(500).json({ error: error.message });
        }
    })

router.post("/login",
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
            const user = await User.findOne({ username });
            if (!user) return res.status(404).json({ message: "User not found" });

            const isPasswordCorrect = await bcrypt.compare(password, user.password);
            if (!isPasswordCorrect) return res.status(400).json({ message: "Wrong Password" });

            const token = jwt.sign(
                { userID: user._id, username: user.username },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            )

            res.status(200).json({ token, userID: user._id });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    })

export default router;