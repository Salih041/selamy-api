import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    target: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    targetType: {
        type: String,
        enum : ['Post', 'Comment', 'User'],
        required: true
    },
    targetPost:
    {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Post'
    },
    reason:{
        type: String,
        required: true
    },
    description:{
        type: String,
        maxlength: 300
    },
    status:{
        type:String,
        enum: ['pending','resolved','dismissed'],
        default : 'pending'
    }
}, {timestamps:true})

export default mongoose.model('Report', reportSchema);