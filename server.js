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
import sitemapRoute from "./siteMapRoute.js";
import ExpressMongoSanitize from "express-mongo-sanitize";
import path from "path";
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger.js';
import swaggerAuthMiddleware from "./middlewares/swaggerAuthMiddleware.js";
import { globalLimiter } from "./middlewares/limiters.js";
import passport from "./config/passport.js";
import oauthRoutes from "./routes/oauth.js";



dotenv.config();
const app = express();
app.set('trust proxy', 'loopback');

//! DEPLOYMENT cors settings
const allowedOrigins = [
    "http://localhost:5173", // Test
    "https://www.selamy.me",
    "https://selamy.me", // url
    "https://google.com", // !! 
    "https://salih-blog-api-server.onrender.com"
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); //mobile apps or curl requests

        if (origin && allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS block: This domain is not allowed!'));
        }
    }
}));

const PORT = process.env.PORT || 3000;
const dburl = process.env.MONGO_URL;

const swaggerLoginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 30
});

app.get('/robots.txt', (req, res) => { //robots.txt
    res.sendFile(path.resolve('robots.txt'));
});

app.use(helmet());
app.use(express.json());
app.use(passport.initialize());


app.use((req, res, next) => {
    if (req.body) ExpressMongoSanitize.sanitize(req.body);
    if (req.params) ExpressMongoSanitize.sanitize(req.params);
    if (req.query) ExpressMongoSanitize.sanitize(req.query);
    next();
})

app.use(express.urlencoded({ extended: true }));


mongoose.connect(dburl)
    .then(() => {
        console.log("DB connected");
        app.listen(PORT, () => { console.log("Server is running") });
    }).catch((err) => {
        console.error("DB Error : " + err);
        process.exit(1);
    })

app.use('/internal-docs', swaggerLoginLimiter, swaggerAuthMiddleware, swaggerUi.serve, swaggerUi.setup(specs, {
    swaggerOptions: {
        persistAuthorization: true,
        displayOperationId: true,
    }
}));

app.use(globalLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/oauth", oauthRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/report", reportRoutes);
app.use("/", sitemapRoute);