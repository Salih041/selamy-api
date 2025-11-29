import express from "express";
import Post from "../models/Post.js";
import User from "../models/User.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

router.get("/", async (req, res) => {   // get all posts
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skipIndex = (page - 1) * limit;

        const posts = await Post.find().populate("author", "username").select("-comments -likes").sort({ createdAt: -1 }).skip(skipIndex).limit(limit)
        const totalResults = await Post.countDocuments({});

        res.status(200).json({
            data: posts,
            pagination: {
                currentPage: page,
                limit: limit,
                totalResults: totalResults,
                totalPages: Math.ceil(totalResults / limit)
            }
        })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

router.get("/search", async (req, res) => {  //search post
    try {
        const searchTerm = req.query.q;
        if (!searchTerm) return res.status(400).json({ message: "term required" });

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skipIndex = (page - 1) * limit;

        const safeSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const users = await User.find({ username: { $regex: safeSearchTerm, $options: 'i' } }).select("_id");
        const authorIds = users.map(user => user._id);

        const regex = new RegExp(safeSearchTerm, 'i');

        const queryFilter = {
            $or: [
                { title: { $regex: safeSearchTerm, $options: 'i' } },
                { content: { $regex: safeSearchTerm, $options: 'i' } },
                { tags: { $in: [regex] } },
                { author: { $in: authorIds } }
            ]
        }
        const posts = await Post.find(queryFilter).populate("author", "username").select("-comments -likes").sort({ createdAt: -1 }).skip(skipIndex).limit(limit)
        const totalResults = await Post.countDocuments(queryFilter);

        res.status(200).json({
            data: posts,
            pagination: {
                currentPage: page,
                limit: limit,
                totalResults: totalResults,
                totalPages: Math.ceil(totalResults / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.get("/user/:userId", async (req, res) => {
    try {
        const posts = await Post.find({ author: req.params.userId }).populate("author", "username").sort({ createdAt: -1 });
        res.status(200).json(posts)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.get("/:id", async (req, res) => {  // get one post by id
    try {
        const post = await Post.findById(req.params.id).populate("author", "username").populate({ path: "comments.author", select: "username" });
        if (!post) return res.status(404).json({ message: "Post Not found" });

        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.post("/", authMiddleware,
    [
        body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 40 }).withMessage("Title must be 40 characters maximum."),
        body("content").trim().notEmpty().withMessage("Content is required").isLength({min:200, max: 80000 }).withMessage("Content must be at least 200 and at most 20000 characters.")
    ],
    async (req, res) => {
        try {

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ message: errors.array()[0].msg });
            }

            const { title, content, tags } = req.body;

            const newPost = new Post({
                title,
                content,
                tags: tags || [],
                author: req.user.userID
            })

            const savedPost = await newPost.save();
            res.status(201).json({ savedPost });
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    })

router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        if (post.author.toString() !== req.user.userID) return res.status(403).json({ message: "invalid auth" });

        await post.deleteOne();
        res.status(200).json({ message: "Post deleted" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

router.put("/:id", authMiddleware,
    [
        body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 40 }).withMessage("Title must be 40 characters maximum."),
        body("content").trim().notEmpty().withMessage("Content is required").isLength({ max: 80000 }).withMessage("Content must be 20000 characters maximum.")
    ],
    async (req, res) => {
        try {

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ message: errors.array()[0].msg });
            }

            const post = await Post.findById(req.params.id);
            if (!post) return res.status(404).json({ message: "Post Not Found" });

            if (post.author.toString() !== req.user.userID) return res.status(403).json({ message: "invalid auth" });

            const { title, content, tags } = req.body;
            if (title) post.title = title;
            if (content) post.content = content;
            if (tags) post.tags = tags;

            const updatedPost = await post.save();

            res.status(200).json(updatedPost)

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    })

router.post("/:id/comment", authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) return res.status(400).json({ message: "text required" });

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post Not FOund" });

        const mentionRegex = /@(\w+)/g;
        const matches = text.match(mentionRegex) || [];
        const usernames = matches.map(m => m.slice(1));

        let mentionIds = [];
        if (usernames.length > 0) {
            const mentionedUsers = await User.find({ username: { $in: usernames } }).select("_id");
            mentionIds = mentionedUsers.map(user => user._id);
        }

        const comment = {
            text: text,
            author: req.user.userID,
            mentions : mentionIds
        }

        post.comments.push(comment);
        post.commentCount += 1;
        await post.save();

        await post.populate({
            path: 'comments.author',
            select: 'username profilePicture'
        });

        const addedComment = post.comments[post.comments.length - 1];

        //notif
        
        res.status(200).json(addedComment);
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.delete("/:id/comment/:commentid", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post Not FOund" });

        const comment = post.comments.id(req.params.commentid);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        if (!(comment.author.toString() === req.user.userID || post.author.toString() === req.user.userID)) return res.status(403).json({ message: "invalid auth" });

        comment.deleteOne();
        post.commentCount -= 1;

        const savedpost = await post.save()

        res.status(200).json(savedpost);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

router.put("/:id/comment/:commentid", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post Not FOund" });

        const comment = post.comments.id(req.params.commentid);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        if (!(comment.author.toString() === req.user.userID)) return res.status(403).json({ message: "invalid auth" });

        const { text } = req.body;
        comment.text = text;

        const updatedPost = await post.save();
        res.status(200).json(updatedPost);
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.put("/:id/comment/:commentid/like", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = post.comments.id(req.params.commentid);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        const userId = req.user.userID;
        const hasLiked = comment.likes.some(likeId => likeId.equals(userId));
        let message = ""
        if (hasLiked) {
            comment.likes.pull(userId);
            comment.likeCount -= 1;
            message = "comment unliked"
        }
        else {
            comment.likes.push(userId);
            comment.likeCount += 1;
            message = "comment liked";
        }

        await post.save();

        res.status(200).json({ message: message, likeCount: comment.likeCount, likes: comment.likes })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.put("/:id/like", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post Not Found" });

        const userId = req.user.userID;

        const hasLiked = post.likes.some(likeId => likeId.equals(userId));
        let message = "";
        if (hasLiked) { // unLike
            post.likes.pull(userId);
            post.likeCount -= 1;
            message = "Unliked";
        }
        else {
            post.likes.push(userId);
            post.likeCount += 1;
            message = "Liked"
        }

        await post.save();

        res.status(200).json({ message: message, likeCount: post.likeCount, likes: post.likes })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

router.post("/upload-image", authMiddleware, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Image couldnt be upload." });
        }
        res.status(200).json({ url: req.file.path });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;