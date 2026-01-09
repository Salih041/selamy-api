import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import { cloudinary } from "../config/cloudinary.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";
import sanitizeHtml from "sanitize-html"
import { URL } from "url";

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => { // get all users (admin)
    try {
        const currentUser = await User.findById(req.user.userID).select("-password");
        if (currentUser.role !== "admin") {
            return res.status(403).json({ message: "Forbidden" })
        }
        else{
            const allUsers = await User.find().select("displayName username _id createdAt").sort({ createdAt: -1 });
            res.status(200).json(allUsers);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message })
    }
})

router.get("/:id", async (req, res) => {  // user by id
    try {
        const user = await User.findById(req.params.id).select("-password").populate("following", "username profilePicture displayName").populate("followers", "username profilePicture displayName");

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
        const { bio, displayName } = req.body;
        if (req.user.userID !== req.params.id) {
            return res.status(403).json({ message: "You can only edit your own account." });
        }

        const currentUser = await User.findById(req.params.id);
        if (!currentUser) return res.status(404).json({ message: "User not found" });

        const cleanBio = sanitizeHtml(bio, {
            allowedTags: [],
            allowedAttributes: {}
        });
        const cleanDisplayName = sanitizeHtml(displayName, {
            allowedTags: [],
            allowedAttributes: {}
        });
        const updates = {
            bio: cleanBio,
            displayName: cleanDisplayName,
        };

        if (req.body.socials) {
            let socialData;
            try {
                socialData = typeof req.body.socials === 'string'
                    ? JSON.parse(req.body.socials)
                    : req.body.socials;
            } catch (e) {
                return res.status(400).json({ message: "Invalid JSON format for socials" });
            }

            const validateUrl = (url, allowedDomains) => {
                if (!url || typeof url !== 'string') return "";
                let cleanUrl = url.trim();
                if (!cleanUrl) return "";

                if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(cleanUrl)) {
                    cleanUrl = `https://${cleanUrl}`;
                }

                try {
                    const parsedUrl = new URL(cleanUrl);
                    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
                        return "";
                    }
                    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
                    const isValid = allowedDomains.some(domain =>
                        hostname === domain || hostname.endsWith(`.${domain}`)
                    );
                    if (!isValid) return "";
                    return parsedUrl.href;
                } catch (error) {
                    return "";
                }
            };
            if (socialData.x) socialData.x = validateUrl(socialData.x, ['x.com', 'twitter.com']);
            if (socialData.instagram) socialData.instagram = validateUrl(socialData.instagram, ['instagram.com']);
            if (socialData.github) socialData.github = validateUrl(socialData.github, ['github.com']);

            updates.socials = socialData;
        }

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

router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        if (req.user.userID !== req.params.id) {
            return res.status(403).json({ message: "You cannot make transactions outside of your own account!" });
        }
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.profilePicture) {
            const publicId = getPublicIdFromUrl(user.profilePicture);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
            }
        }

        await Post.deleteMany({ author: user._id });
        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: "Your account and all your posts have been successfully deleted." });
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.put("/:id/follow", authMiddleware, async (req, res) => {
    try {
        if (req.user.userID === req.params.id) return res.status(400).json({ message: "You cannot follow yourself!" });

        const userToFollow = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user.userID);
        if (!userToFollow || !currentUser) return res.status(404).json({ message: "User not found" });

        if (!currentUser.following.some(id => id.toString() === req.params.id)) { // not already following
            await userToFollow.updateOne({ $push: { followers: currentUser._id } });
            await currentUser.updateOne({ $push: { following: userToFollow._id } });

            await Notification.create({
                recipient: userToFollow._id,
                sender: currentUser._id,
                type: "follow",
            });

            res.status(200).json({ message: "User followed successfully!", isFollowing: true });
        }
        else {
            await userToFollow.updateOne({ $pull: { followers: currentUser._id } });
            await currentUser.updateOne({ $pull: { following: userToFollow._id } });
            res.status(200).json({ message: "User unfollowed successfully!", isFollowing: false });
        }

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

export default router;