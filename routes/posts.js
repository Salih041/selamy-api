import express from "express";
import Post from "../models/Post.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/",async (req,res)=>{   // get all posts
    try{
        const posts = await Post.find().populate("author","username").sort({createdAt : -1})
        res.status(200).json(posts)
    }catch(error){
        res.status(500).json({error : error.message});
    }
})

router.get("/:id", async (req,res)=>{  // get one post by id
    try{
        const post = await Post.findById(req.params.id).populate("author","username").populate({path:"comments.author",select:"username"});
        if(!post) return res.status(404).json({message : "Post Not found"});

        res.status(200).json(post);
    }catch(error){
        res.status(500).json({error:error.message})
    }
})

router.post("/",authMiddleware, async (req,res)=>{
    try{
        const {title,content} = req.body;

        const newPost = new Post({
            title,
            content,
            author: req.user.userID
        })

        const savedPost = await newPost.save();
        res.status(201).json({savedPost});
    }catch(error){
        res.status(500).json({error : error.message})
    }
})

router.delete("/:id",authMiddleware, async(req,res)=>{
    try{
        const post = await Post.findById(req.params.id);
        if(!post) return res.status(404).json({message : "Post bulunamadı"});

        if(post.author.toString() !== req.user.userID) return res.status(403).json({message : "Yetki yok"});

        await post.deleteOne();
        res.status(200).json({message : "Post silindi"});

    }catch(error){
        res.status(500).json({error : error.message});
    }
})

router.put("/:id", authMiddleware, async(req,res)=>{
    try{
        const post = await Post.findById(req.params.id);
        if(!post) return res.status(404).json({message : "Post Not Found"});

        if(post.author.toString() !== req.user.userID) return res.status(403).json({message : "invalid auth"});

        const {title,content} = req.body;
        if(title) post.title = title;
        if(content)  post.content=content;

        const updatedPost = await post.save();

        res.status(200).json(updatedPost)

    }catch(error){
        res.status(500).json({error: error.message});
    }
})

router.post("/:id/comment", authMiddleware, async(req,res)=>{
    try{
        const {text} = req.body;

        if(!text) return res.status(400).json({message : "text required"});

        const post = await Post.findById(req.params.id);
        if(!post) return res.status(404).json({message : "Post Not FOund"});

        const comment = {
            text : text,
            author : req.user.userID
        }

        post.comments.push(comment);
        await post.save();

        const addedComment = post.comments[post.comments.length-1];
        res.status(200).json(addedComment);
    }catch(error)
    {
        res.status(500).json({error : error.message})
    }
})

router.delete("/:id/comment/:commentid", authMiddleware, async (req,res)=>{
    try{
        const post = await Post.findById(req.params.id);
        if(!post) return res.status(404).json({message : "Post Not FOund"});

        const comment = post.comments.id(req.params.commentid);
        if(!comment) return res.status(404).json({message : "Comment not found"});

        if(!(comment.author.toString() === req.user.userID || post.author.toString() === req.user.userID)) return res.status(403).json({message : "invalid auth"});

        comment.deleteOne();

        const savedpost = await post.save()

        res.status(200).json(savedpost);

    }catch(error){
        res.status(500).json({error:error.message});
    }
})

router.put("/:id/comment/:commentid", authMiddleware , async (req,res)=>{
    try{
        const post = await Post.findById(req.params.id);
        if(!post) return res.status(404).json({message : "Post Not FOund"});

        const comment = post.comments.id(req.params.commentid);
        if(!comment) return res.status(404).json({message : "Comment not found"});

        if(!(comment.author.toString() === req.user.userID)) return res.status(403).json({message : "invalid auth"});

        const {text} = req.body;
        comment.text = text;

        const updatedPost = await post.save();
        res.status(200).json(updatedPost);
    }catch(error){
        res.status(500).json({error : error.message})
    }
})

router.post("/:id/like", authMiddleware, async (req,res)=>{
    try{
        const post = await Post.findById(req.params.id);
        if(!post) return res.status(404).json({message : "Post Not Found"});

        const userId = req.user.userID;

        const hasLiked = post.likes.some(likeId => likeId.equals(userId));
        let message="";
        if(hasLiked){ // unLike
            post.likes.pull(userId);
            message = "Unliked";
        }
        else{
            post.likes.push(userId);
            message = "Liked"
        }

        await post.save();

        res.status(200).json({message:message,likesCount:post.likes.length,likes:post.likes})
    }catch(error){
        res.status(500).json({error : error.message});
    }
})

export default router;