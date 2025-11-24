import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.js"
import postRoutes from "./routes/posts.js"
import userRoutes from "./routes/users.js"


dotenv.config();
const app = express();

//! DEPLOYMENT cors settings
const allowedOrigins = [
    "http://localhost:5173", // Test
    "https://selamy.vercel.app" // url
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS block: This domain is not allowed!'));
        }
    }
}));

const PORT = process.env.PORT || 3000;
const dburl = process.env.MONGO_URL;

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15min
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        message: "Too many requests. Please try again in 15 minutes."
    }
});
app.use(limiter);
app.use(helmet());
app.use(express.json());

mongoose.connect(dburl)
    .then(() => {
        console.log("MongoDB connected");
        app.listen(PORT, () => { console.log("Server is running on ", PORT) });
    }).catch((err) => {
        console.error("MongoDB error");
        console.error(err);
        process.exit(1);
    })

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);

