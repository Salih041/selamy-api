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
        enum: ['mention', 'follow', 'like', 'comment'], 
        default: 'mention' 
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

export default mongoose.model('Notification',notificationSchema);