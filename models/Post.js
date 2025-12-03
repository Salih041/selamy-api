import mongoose from "mongoose";


const commentSchema = new mongoose.Schema({
    text : {type:String, required: true, trim:true},
    author : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },

    mentions : [
        {
            type:mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],

    likes : [{type:mongoose.Schema.Types.ObjectId,ref : 'User'}],
    likeCount : {type:Number, default:0}
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
    commentCount : {type:Number, default:0},
    likes : [{type: mongoose.Schema.Types.ObjectId,ref : 'User',}],
    likeCount : {type:Number, default:0},
    tags : {type:[String],default:[]},

    isEdited : {type:Boolean, default:false},
    editedAt : {type:Date},

    viewCount : {type:Number, default:0},
    slug: { type: String, unique: true, sparse: true } // url
},{timestamps:true})


export default mongoose.model('Post',postSchema);