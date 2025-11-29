import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },

    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationTokenExpires: Date,

    profilePicture : {type: String, default:""},
    bio : {type: String, default:"", maxLength:140}
}, { timestamps: true })

export default mongoose.model('User', userSchema);