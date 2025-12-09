import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, 
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        message: "Too many login attempts. Please try again in 15 minutes."
    }
})

export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, 
    message: {
        status: 429,
        message: "You have sent too many account creation requests."
    }
})

export const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3,
    message : {
        status: 429,
        message: "Too many password reset requests. Please try again later."
    }
});

