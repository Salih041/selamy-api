import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true , lowercase:true},
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },

    displayName: { 
        type: String, 
        trim: true,
        maxLength: 50 
    },

    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationTokenExpires: Date,

    resetPasswordToken: String,
    resetPasswordExpires: Date,

    profilePicture : {type: String, default:""},
    bio : {type: String, default:"", maxLength:140},
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true })

userSchema.index({ createdAt: 1 }, { 
    expireAfterSeconds: 3600, 
    partialFilterExpression: { isVerified: false } 
});

export default mongoose.model('User', userSchema);