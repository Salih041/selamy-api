import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import multerStorageCloudinary from 'multer-storage-cloudinary';
const { CloudinaryStorage } = multerStorageCloudinary;

dotenv.config();
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'blog-images', //open folder
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // file formats
        transformation: [{ width: 1000, crop: "limit" }] 
    }
});

export { cloudinary, storage };