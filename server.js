import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.js"

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const dburl = process.env.MONGO_URL;

app.use(cors());
app.use(express.json());

mongoose.connect(dburl)
    .then(()=>{
        console.log("MongoDB connected");
        app.listen(PORT,()=>{console.log("Server is running on " , PORT)});
    }).catch((err)=>{
        console.error("MongoDB hatası");
        console.error(err);
        process.exit(1);
    })


app.get("/",(req,res)=>{
    res.send("MErhaba");
})

