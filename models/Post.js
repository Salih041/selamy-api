import mongoose from "mongoose";


const commentSchema = new mongoose.Schema({
    text : {type:String, required: true, trim:true},
    author : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true
    }
},{timestamps:true})


const postSchema = new mongoose.Schema({
    title : {type : String, required : true},
    content : {type : String, required : true},
    author : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },
    comments : [commentSchema],
    likes : [{type: mongoose.Schema.Types.ObjectId,ref : 'User',}]
},{timestamps:true})

export default mongoose.model('Post',postSchema);