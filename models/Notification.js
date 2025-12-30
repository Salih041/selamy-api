import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    recipient : {
        type : mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required : true
    },
    sender: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['mention', 'follow', 'like', 'comment','delete', 'unpublish'], 
        default: 'mention' 
    },
    message : {
        type : String,
        default : ""
    },
    post: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Post' 
    },
    commentId: { 
        type: String 
    },
    isRead: { 
        type: Boolean, 
        default: false 
    }
},{timestamps:true})

notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });//1 day

export default mongoose.model('Notification',notificationSchema);