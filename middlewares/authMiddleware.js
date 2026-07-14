import jwt from "jsonwebtoken";
import User from "../models/User.js";
import {redis} from "../config/redis.js";

const authMiddleware = async (req,res,next)=>{
    try{
        const authHeader = req.headers.authorization;
        if(!authHeader) return res.status(401).json({message : "Token not found"});

        const token = authHeader.split(" ")[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

        const isBlackListed = await redis.get(`bl:${decodedToken.jti}`);
        if(isBlackListed) return res.status(401).json({message : "Token revoked"})

        const user = await User.findById(decodedToken.userID).select("username isBanned");
        if(!user) return res.status(404).json({message : "User not found"});
        if(user.isBanned) return res.status(403).json({ message: "Your account has been banned." });

        req.user = {userID : decodedToken.userID , username : decodedToken.username};
        next();
    }catch(err){
        res.status(401).json({message : "Invalid Token"});
    }
}

export default authMiddleware;