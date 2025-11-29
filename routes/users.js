import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import { cloudinary } from "../config/cloudinary.js";

const router = express.Router();

router.get("/:id", async (req, res) => {  // user by id
    try {
        const user = await User.findById(req.params.id).select("-password");

        if (!user) return res.status(404).json({ message: "User not found" });

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

const getPublicIdFromUrl = (url) => {
    if (!url) return null;
    try {
        const parts = url.split('/');
        const lastPart = parts[parts.length - 1];
        const fileName = lastPart.split('.')[0];
        const folderName = parts[parts.length - 2];
        return `${folderName}/${fileName}`;
    } catch (error) {
        console.error("Public ID could not be extracted:", error);
        return null;
    }
};

router.put("/update/:id", authMiddleware, upload.single('profilePicture'), async (req, res) => {
    try {
        if (req.user.userID !== req.params.id) {
            return res.status(403).json({ message: "You can only edit your own account." });
        }

        const currentUser = await User.findById(req.params.id);
        if (!currentUser) return res.status(404).json({ message: "User not found" });

        const updates = {
            bio: req.body.bio,
            displayName: req.body.displayName,
            // useranme?
        };

        if (req.file) {
            if (currentUser.profilePicture) {
                const publicId = getPublicIdFromUrl(currentUser.profilePicture);
                if (publicId) {
                    cloudinary.uploader.destroy(publicId);
                }
            }
            updates.profilePicture = req.file.path;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true }
        ).select("-password");

        res.status(200).json(updatedUser);

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

export default router;