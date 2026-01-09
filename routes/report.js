import express from "express";
import Report from "../models/Report.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import sanitizeHtml from "sanitize-html";
import User from "../models/User.js";
import ExpressMongoSanitize from "express-mongo-sanitize";

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { target, targetType, targetPost ,reason, description } = ExpressMongoSanitize.sanitize(req.body); 
        if (!target || !targetType || !reason) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const existingReport = await Report.findOne({
            reporter: String(req.user.userID),
            target: String(target)
        })
        console.log(typeof(req.user.userID))
        if (existingReport) return res.status(409).json({ message: "You have already reported this content" })

        if (description.length > 300) return res.status(413).json({ message: "Description is too long" });
        const cleanDescription = sanitizeHtml(description, {
            allowedTags: [],
            allowedAttributes: {}
        })
        const cleanReason = sanitizeHtml(reason, {
            allowedTags: [],
            allowedAttributes: {}
        })
        const newReport = new Report({
            reporter: req.user.userID,
            target,
            targetType,
            targetPost,
            reason: cleanReason,
            description: cleanDescription
        })
        await newReport.save();
        res.status(201).json({ message: "Report submitted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message })
    }
})

router.get("/", authMiddleware, async (req,res)=>{
    try{
        const currentUser = await User.findById(req.user.userID).select("-password");
        if(currentUser.role !== "admin") {
            return res.status(403).json({message : "Forbidden"})
        }
        else{
            const reports = await Report.find().populate('reporter', 'username displayName profilePicture').populate('target').populate('targetPost').sort({createdAt : -1});
            res.status(200).json(reports);
        }
    }catch(error)
    {
        console.error(error);
        res.status(500).json({error:error.message});
    }
})

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.userID);
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }
        if(currentUser.role !== "admin") {
            return res.status(403).json({message : "Unauth"})
        }
        else{
            await Report.findByIdAndDelete(req.params.id);
            res.status(200).json("Report resolved/deleted");
        }
    } catch (err) {
        res.status(500).json({error : err.message});
    }
});

export default router