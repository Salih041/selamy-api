import express from "express";
import Post from "../models/Post.js";
import User from "../models/User.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import Notification from "../models/Notification.js";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";

const router = express.Router();


// SLUGIFY
const slugify = (text) => {
    const trMap = { 'ç': 'c', 'ğ': 'g', 'ş': 's', 'ü': 'u', 'ö': 'o', 'ı': 'i', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ü': 'u', 'Ş': 's', 'Ğ': 'g', 'Ç': 'c' };
    return text
        .toLowerCase()
        .split('')
        .map(char => trMap[char] || char)
        .join('')
        .replace(/[^-a-zA-Z0-9\s]+/ig, '')
        .replace(/\s/gi, "-")
        .replace(/-+/g, "-")
        .trim();
};

const findPostByIdOrSlug = async (id) => {
    if (mongoose.Types.ObjectId.isValid(id)) {
        const post = await Post.findById(id);
        if (post) return post;
    }
    return await Post.findOne({ slug: id });
};

let popularTagsCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000;

router.get("/popular-tags", async (req, res) => {
    try {
        const currentTime = Date.now();

        if (popularTagsCache && (currentTime - lastCacheTime < CACHE_DURATION)) {
            return res.status(200).json(popularTagsCache);
        }

        console.log("data is coming from db")
        const popularTags = await Post.aggregate([
            { $unwind: "$tags" },
            {
                $group: {
                    _id: "$tags",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        popularTagsCache = popularTags;
        lastCacheTime = currentTime;

        res.status(200).json(popularTags);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Tags could not be retrieved" })
    }
})

router.get("/", async (req, res) => {   // get all posts
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skipIndex = (page - 1) * limit;

        const posts = await Post.find({ statu: 'published' }).populate("author", "username profilePicture displayName").select("-comments -likes").sort({ firstPublishDate: -1 }).skip(skipIndex).limit(limit)
        const totalResults = await Post.countDocuments({ statu: 'published' });

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
        let searchTerm = req.query.q;
        let searchTag = req.query.tag;
        if (!searchTerm && !searchTag) return res.status(400).json({ message: "term required" });

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skipIndex = (page - 1) * limit;

        let queryFilter = {};

        if (searchTag) {  // search by tag
            if (typeof searchTag !== 'string') {
                searchTag = String(searchTag);
            }
            const safeSearchTag = searchTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(safeSearchTag, 'i');

            queryFilter = {
                $and: [
                    { statu: 'published' },
                    { tags: { $in: [regex] } }
                ]
            }
        }

        else if (searchTerm) {  // search
            if (typeof searchTerm !== 'string') {
                searchTerm = String(searchTerm);
            }
            const safeSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(safeSearchTerm, 'i');

            const users = await User.find({ username: { $regex: safeSearchTerm, $options: 'i' } }).select("_id");
            const authorIds = users.map(user => user._id);

            queryFilter = {
                $and: [
                    { statu: 'published' },
                    {
                        $or: [
                            { title: { $regex: safeSearchTerm, $options: 'i' } },
                            { content: { $regex: safeSearchTerm, $options: 'i' } },
                            { tags: { $in: [regex] } },
                            { author: { $in: authorIds } }
                        ]
                    }
                ]
            }
        }

        const posts = await Post.find(queryFilter).populate("author", "username profilePicture displayName").select("-comments -likes").sort({ firstPublishDate: -1 }).skip(skipIndex).limit(limit)
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

router.get("/feed", authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skipIndex = (page - 1) * limit;

        const currentUser = await User.findById(req.user.userID);
        const feedPosts = await Post.find({ author: { $in: currentUser.following }, statu: 'published' }).populate("author", "username profilePicture displayName").select("-comments -likes").sort({ firstPublishDate: -1 }).skip(skipIndex).limit(limit)
        const totalResults = await Post.countDocuments({ author: { $in: currentUser.following }, statu: 'published' });
        res.status(200).json({
            data: feedPosts,
            pagination: {
                currentPage: page,
                limit: limit,
                totalResults: totalResults,
                totalPages: Math.ceil(totalResults / limit)
            }
        })

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.get("/user/:userId", async (req, res) => {
    try {
        let filter = { author: req.params.userId };
        filter.statu = 'published';
        //Optional Auth
        /*let currentUserId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            try{
                const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
                currentUserId = decodedToken.userID;
            }
            catch(error){
                currentUserId = null;
            }
        }
        const isOwner = currentUserId && currentUserId === req.params.userId;
        // end of optional auth

        if (!isOwner) {
            filter.statu = 'published';
        }*/

        const posts = await Post.find(filter).populate("author", "username displayName profilePicture").sort({ createdAt: -1 });
        res.status(200).json(posts)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.get("/my-liked", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userID).select('likedPosts');
        if (!user) return res.status(404).json({ message: "User not found" });

        const liked = await Post.find({
            _id: { $in: user.likedPosts }
        }).populate("author", "username displayName profilePicture")
            .select("-comments -likes").
            sort({ firstPublishDate: -1 });

        res.status(200).json(liked)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.get("/my-saved", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userID).select('savedPosts');
        if (!user) return res.status(404).json({ message: "User not found" });

        const saveds = await Post.find({
            _id: { $in: user.savedPosts }
        }).populate("author", "username displayName profilePicture")
            .select("-comments -likes")
            .sort({ firstPublishDate: -1 });

        res.status(200).json(saveds);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

router.get("/my-drafts", authMiddleware, async (req, res) => {
    try {
        const drafts = await Post.find({
            author: req.user.userID,
            statu: 'draft'
        }).populate("author", "username displayName profilePicture").sort({ createdAt: -1 });
        res.status(200).json(drafts)
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

router.get("/:id", async (req, res) => {  // get one post by id
    try {
        const id = req.params.id;
        let post;
        if (mongoose.Types.ObjectId.isValid(id)) {  // id
            post = await Post.findById(id).populate("author", "username profilePicture displayName").populate({ path: "comments.author", select: "username profilePicture displayName " }).populate({ path: "comments.likes", select: "username profilePicture displayName" }).populate("likes", "username profilePicture displayName");
        }
        if (!post) // slug
        {
            post = await Post.findOne({ slug: id })
                .populate("author", "username profilePicture displayName")
                .populate({ path: "comments.author", select: "username profilePicture displayName" })
                .populate({ path: "comments.likes", select: "username profilePicture displayName" })
                .populate("likes", "username profilePicture displayName");
        }
        if (!post) return res.status(404).json({ message: "Post Not Found" });

        // optional Auth
        let currentUserId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            try {
                const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
                currentUserId = decodedToken.userID;
            }
            catch (error) {
                currentUserId = null;
            }
        }
        const isOwner = currentUserId && currentUserId === post.author._id.toString();
        // end of optional auth
        if (!isOwner) {
            if (post.statu !== 'published') {
                return res.status(403).json({ message: "You are not authorized to view this post." });
            }
        }

        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.post("/", authMiddleware,
    [
        body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 40 }).withMessage("Title must be 40 characters maximum."),
        body("content").trim().notEmpty().withMessage("Content is required").isLength({ min: 200, max: 80000 }).withMessage("Content must be at least 200 and at most 20000 characters."),
        body("tags").optional().isArray().withMessage("Tags must be an array")
    ],
    async (req, res) => {
        try {

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ message: errors.array()[0].msg });
            }

            const { title, content, tags, statu } = req.body;
            let slug = slugify(title);
            let isUnique = false;
            while (!isUnique) {
                const existingPost = await Post.findOne({ slug });
                if (!existingPost) {
                    isUnique = true;
                } else {
                    slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
                }
            }

            const cleanContent = sanitizeHtml(content, {
                allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
                allowedAttributes: {
                    '*': ['style', 'class'],
                    'a': ['href', 'name', 'target'],
                    'img': ['src']
                }
            });
            const cleanTitle = sanitizeHtml(title, {
                allowedTags: [],
                allowedAttributes: {}
            })
            let cleanTags = []
            if (Array.isArray(tags)) {
                cleanTags = tags.map(tag => {
                    return sanitizeHtml(String(tag), {
                        allowedTags: [],
                        allowedAttributes: {}
                    }).trim().toLowerCase();
                })
                    .filter(tag => tag.length > 0);
            }

            const newPost = new Post({
                title: cleanTitle,
                content: cleanContent,
                tags: cleanTags || [],
                author: req.user.userID,
                slug: slug,
                statu: statu || 'published'
            })
            if (statu === "published") {
                newPost.firstPublishDate = Date.now()
            }

            const savedPost = await newPost.save();
            res.status(201).json({ savedPost });
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    })

router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const post = await findPostByIdOrSlug(req.params.id)
        if (!post) return res.status(404).json({ message: "Post not found" });

        const currentUser = await User.findById(req.user.userID);
        if (post.author.toString() !== req.user.userID && currentUser.role !== 'admin') return res.status(403).json({ message: "invalid auth" });

        await post.deleteOne();

        if (currentUser.role === "admin" && currentUser._id.toString() !== post.author.toString()) {
            const reasonMessage = req.query.reason || "";
            await Notification.create({
                recipient: post.author,
                sender: req.user.userID,
                type: 'delete',
                message: reasonMessage
            })
        }

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

            const post = await findPostByIdOrSlug(req.params.id);
            if (!post) return res.status(404).json({ message: "Post Not Found" });

            const currentUser = await User.findById(req.user.userID);
            if (post.author.toString() !== req.user.userID && currentUser.role !== 'admin') return res.status(403).json({ message: "invalid auth" });

            const { title, content, tags, statu } = req.body;
            if (title) {
                const cleanTitle = sanitizeHtml(title, {
                    allowedTags: [],
                    allowedAttributes: {}
                })
                post.title = cleanTitle;
            }
            if (content) {
                const cleanContent = sanitizeHtml(content, {
                    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
                    allowedAttributes: {
                        '*': ['style', 'class'],
                        'a': ['href', 'name', 'target'],
                        'img': ['src']
                    }
                });
                post.content = cleanContent;
            }
            if (tags) {
                let cleanTags = []
                if (Array.isArray(tags)) {
                    cleanTags = tags.map(tag => {
                        return sanitizeHtml(String(tag), {
                            allowedTags: [],
                            allowedAttributes: {}
                        }).trim().toLowerCase();
                    })
                        .filter(tag => tag.length > 0);
                }
                post.tags = cleanTags;
            }
            if (!(post.firstPublishDate === null)) {
                post.isEdited = true;
                post.editedAt = Date.now();
            }
            if (statu) {
                post.statu = statu;
                if (statu === "draft" && currentUser.role === "admin" && currentUser._id.toString() !== post.author.toString()) // admin -> unpublish
                {
                    const reasonMessage = req.query.reason || "";
                    await Notification.create({
                        recipient: post.author,
                        sender: req.user.userID,
                        type: 'unpublish',
                        post: post._id,
                        message: reasonMessage
                    })
                }
            }
            if (post.firstPublishDate === null && statu === "published") {
                post.firstPublishDate = Date.now()
            }

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

        const post = await findPostByIdOrSlug(req.params.id)
        if (!post) return res.status(404).json({ message: "Post Not FOund" });

        if (post.statu !== 'published') return res.status(403).json({ message: "Cannot comment on unpublished posts." });

        const mentionRegex = /@(\w+)/g;
        const matches = text.match(mentionRegex) || [];
        const usernames = matches.map(m => m.slice(1).toLowerCase());


        let mentionIds = [];
        if (usernames.length > 0) {
            const mentionedUsers = await User.find({ username: { $in: usernames } }).select("_id");
            mentionIds = mentionedUsers.map(user => user._id);

            const notificationsToCreate = mentionIds
                .filter(id => id.toString() !== req.user.userID)
                .map(id => ({
                    recipient: id,
                    sender: req.user.userID,
                    type: 'mention',
                    post: post._id,
                    commentId: undefined
                }));
            if (notificationsToCreate.length > 0) {
                await Notification.insertMany(notificationsToCreate);
            }
        }
        const cleanText = sanitizeHtml(text, {
            allowedTags: [],
            allowedAttributes: {}
        });
        const comment = {
            text: cleanText,
            author: req.user.userID,
            mentions: mentionIds
        }
        if (post.author.toString() !== req.user.userID) {
            await Notification.create({
                recipient: post.author,
                sender: req.user.userID,
                type: 'comment',
                post: post._id
            });
        }

        post.comments.push(comment);
        post.commentCount += 1;
        await post.save();

        await post.populate({
            path: 'comments.author',
            select: 'username profilePicture displayName'
        });

        const addedComment = post.comments[post.comments.length - 1];

        res.status(200).json(addedComment);
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.delete("/:id/comment/:commentid", authMiddleware, async (req, res) => {
    try {
        const post = await findPostByIdOrSlug(req.params.id)
        if (!post) return res.status(404).json({ message: "Post Not FOund" });
        ;

        if (post.statu !== 'published') return res.status(403).json({ message: "Cannot comment on unpublished posts." });

        const comment = post.comments.id(req.params.commentid);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        const currentUser = await User.findById(req.user.userID);
        const isOwner = comment.author.toString() === req.user.userID;
        const isPostOwner = post.author.toString() === req.user.userID;
        const isAdmin = currentUser.role === 'admin'

        if (!isOwner && !isPostOwner && !isAdmin) return res.status(403).json({ message: "invalid auth" });

        comment.deleteOne();
        post.commentCount -= 1;

        const savedpost = await post.save()

        if (isAdmin && currentUser._id.toString() !== comment.author.toString()) {
            const reasonMessage = req.query.reason || "";
            await Notification.create({
                recipient: comment.author,
                sender: req.user.userID,
                type: 'delete',
                post: post._id,
                message: reasonMessage
            })
        }


        res.status(200).json(savedpost);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

router.put("/:id/comment/:commentid", authMiddleware, async (req, res) => {
    try {
        const post = await findPostByIdOrSlug(req.params.id)
        if (!post) return res.status(404).json({ message: "Post Not FOund" });

        if (post.statu !== 'published') return res.status(403).json({ message: "Cannot comment on unpublished posts." });

        const comment = post.comments.id(req.params.commentid);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        if (!(comment.author.toString() === req.user.userID)) return res.status(403).json({ message: "invalid auth" });

        const { text } = req.body;
        const cleanText = sanitizeHtml(text, {
            allowedTags: [],
            allowedAttributes: {}
        });
        comment.text = cleanText;

        const updatedPost = await post.save();
        res.status(200).json(updatedPost);
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.put("/:id/comment/:commentid/like", authMiddleware, async (req, res) => {
    try {
        const post = await findPostByIdOrSlug(req.params.id)
        if (!post) return res.status(404).json({ message: "Post not found" });

        if (post.statu !== 'published') return res.status(403).json({ message: "Cannot like comments on unpublished posts." });

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

            if (comment.author.toString() !== userId) {
                await Notification.create({
                    recipient: comment.author,
                    sender: userId,
                    type: 'like',
                    post: post._id
                });
            }
        }

        await post.save();
        await post.populate({
            path: "comments.likes",
            select: "username profilePicture displayName"
        });
        const updatedComment = post.comments.id(req.params.commentid);


        res.status(200).json({ message: message, likeCount: updatedComment.likeCount, likes: updatedComment.likes })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.put("/:id/like", authMiddleware, async (req, res) => {
    try {
        const post = await findPostByIdOrSlug(req.params.id)
        if (!post) return res.status(404).json({ message: "Post Not Found" });

        if (post.statu !== 'published') return res.status(403).json({ message: "Cannot like unpublished posts." });

        const userId = req.user.userID;

        const hasLiked = post.likes.some(likeId => likeId.equals(userId));
        let message = "";
        if (hasLiked) { // unLike
            post.likes.pull(userId);
            post.likeCount -= 1;
            message = "Unliked";

            await User.findByIdAndUpdate(userId, {
                $pull: { likedPosts: post._id }
            })

            if (post.author.toString() !== userId) {
                await Notification.findOneAndDelete({  // delete notification
                    recipient: post.author,
                    sender: userId,
                    type: 'like',
                    post: post._id
                });
            }

        }
        else {
            post.likes.push(userId);
            post.likeCount += 1;
            message = "Liked"

            await User.findByIdAndUpdate(userId, {
                $addToSet: { likedPosts: post._id }
            })

            if (post.author.toString() !== userId) {

                const existingNotification = await Notification.findOne({
                    recipient: post.author,
                    sender: userId,
                    type: 'like',
                    post: post._id
                });

                if (!existingNotification) {
                    await Notification.create({
                        recipient: post.author,
                        sender: userId,
                        type: 'like',
                        post: post._id
                    });
                }
            }
        }

        await post.save();

        res.status(200).json({ message: message, likeCount: post.likeCount, likes: post.likes })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

router.put("/:id/save", authMiddleware, async (req, res) => {
    try {
        const post = await findPostByIdOrSlug(req.params.id)
        if (!post) return res.status(404).json({ message: "Post Not Found" });
        if (post.statu !== 'published') return res.status(403).json({ message: "Cannot save unpublished posts." });
        const currentUser = await User.findById(req.user.userID);
        const hasSaved = currentUser.savedPosts.some(postId => postId.equals(post._id));
        if (hasSaved) { // already saved
            await currentUser.updateOne({ $pull: { savedPosts: post._id } });
            res.status(200).json({ message: "Post removed from bookmarks", isSaved: false });
        }
        else { // not saved yet! SAVE
            await currentUser.updateOne({ $push: { savedPosts: post._id } });
            res.status(200).json({ message: "Post bookmarked successfully", isSaved: true });
        }

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

router.post("/upload-image", authMiddleware, upload.single('image'), async (req, res) => {
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