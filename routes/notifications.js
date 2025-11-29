import express from "express";
import Notification from "../models/Notification.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
    try {        
        const notifications = await Notification.find({ recipient: req.user.userID })
            .populate("sender", "username profilePicture")
            .populate("post", "title")
            .sort({ createdAt: -1 });
        res.status(200).json(notifications)
    } catch (error) {
        res.status(500).json({error:error.message})
    }
})

router.put("/:id/read",authMiddleware, async (req,res)=>{
    try{
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ message: "Not found" });

        if (notification.recipient.toString() !== req.user.userID) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        notification.isRead = true;
        await notification.save();
        res.status(200).json(notification);

    }catch(error){
        res.status(500).json({error:error.message});
    }
})

router.put("/mark-all-read", authMiddleware, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.userID, isRead: false },
            { $set: { isRead: true } }
        );
        res.status(200).json({ message: "All read" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;