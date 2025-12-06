import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    role : {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
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
    createdAt: { type: Date, default: Date.now },

    followers : [{type:mongoose.Schema.Types.ObjectId, ref:'User'}],
    following : [{type:mongoose.Schema.Types.ObjectId, ref:'User'}],
    savedPosts : [{type:mongoose.Schema.Types.ObjectId, ref:'Post'}],
    likedPosts: [{type:mongoose.Schema.Types.ObjectId, ref:'Post'}],

    socials : {
        x : {type:String, default:''},
        instagram : {type:String, default : ''},
        github : {type:String, default : ''}
    }
}, { timestamps: true })

userSchema.index({ createdAt: 1 }, { 
    expireAfterSeconds: 3600, 
    partialFilterExpression: { isVerified: false } 
});

export default mongoose.model('User', userSchema);