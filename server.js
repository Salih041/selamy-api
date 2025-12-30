import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.js"
import postRoutes from "./routes/posts.js"
import userRoutes from "./routes/users.js"
import notificationRoutes from "./routes/notifications.js"
import reportRoutes from "./routes/report.js";
import ExpressMongoSanitize from "express-mongo-sanitize";



dotenv.config();
const app = express();
app.set('trust proxy', 1);

//! DEPLOYMENT cors settings
const allowedOrigins = [
    "http://localhost:5173", // Test
    "https://www.selamy.me",
    "https://selamy.me" // url
];

app.use(cors({
    origin: (origin, callback) => {
        if (origin && allowedOrigins.includes(origin)) {
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
    max: 200,
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
//app.use(ExpressMongoSanitize());
app.use((req,res,next)=>{
    if(req.body) req.body = ExpressMongoSanitize.sanitize(req.body);
    next();
})

app.use(express.urlencoded({ extended: true }));

const mongoSanitizeMiddleware = (req, res, next) => {
    const sanitize = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        
        for (let key in obj) {
            if (key.startsWith('$') || key.includes('.')) {
                delete obj[key];
            } else {
                sanitize(obj[key]);
            }
        }
    };
    sanitize(req.body);   
    sanitize(req.params);    
    next();
};
app.use(mongoSanitizeMiddleware);


mongoose.connect(dburl)
    .then(() => {
        console.log("DB connected");
        app.listen(PORT, () => { console.log("Server is running") });
    }).catch((err) => {
        console.error("DB Error : "+err);
        process.exit(1);
    })

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/report", reportRoutes);