import jwt from "jsonwebtoken";

const authMiddleware = (req,res,next)=>{
    try{
        const authHeader = req.headers.authorization;
        if(!authHeader) return res.status(401).json({message : "Token not found"});

        const token = authHeader.split(" ")[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {userID : decodedToken.userID , username : decodedToken.username};
        next();
    }catch(err){
        res.status(401).json({message : "Invalid Token"});
    }
}

export default authMiddleware;