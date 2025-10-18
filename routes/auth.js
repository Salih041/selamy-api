import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

router.post("/register", async (req,res)=>{
    try{
        const {username, password} = req.body;
        const hashedPassword = await bcrypt.hash(password,12);

        const newUser = new User({
            username,
            password : hashedPassword
        })

        const savedUser = await newUser.save();
        res.status(201).json({message : "Kullanıcı oluşturuldu", userId:savedUser._id});
    }catch(error){
        res.status(500).json({error : error.message});
    }
})

router.post("/login", async (req,res)=>{
    try{
        const {username, password} = req.body;
        const user = await User.findOne({username});
        if(!user) return res.status(404).json({message : "Kullanıcı Bulunamadı"});

        const isPasswordCorrect = await bcrypt.compare(password,user.password);
        if(!isPasswordCorrect) return res.status(400).json({message : "Şifre yanlış"});

        const token = jwt.sign(
            {userID : user._id, username : user.username},
            process.env.JWT_SECRET,
            {expiresIn : "1h"}
        )

        res.status(200).json({token,userID:user._id});
    }catch(error){
        res.status(500).json({error : error.message});
    }
})

export default router;