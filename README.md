# SelamY Blog API (Backend)

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

**SelamY Blog API** is the robust server-side application powering the Selamy Blog platform. Built with Node.js and Express, it provides a secure RESTful API for content management, user authentication, and media handling.

[**🔴 Live Demo (Frontend)**](https://selamy.vercel.app)

---

## Key Features

- **Secure Authentication:** JWT-based authentication with secure password hashing (Bcrypt).
- **Advanced Security:**
  - **Rate Limiting:** Protection against brute-force and DDoS attacks.
  - **Helmet:** Secure HTTP headers to protect against well-known vulnerabilities.
  - **Input Validation:** Strict data validation using `express-validator`.
  - **NoSQL Injection Protection:** Sanitized queries against injection attacks.
  - **CORS Configuration:** Configured for secure cross-origin requests.
- **Media Management:** Integrated **Cloudinary** & **Multer** for optimized image uploads and storage.
- **Content Management:** Full CRUD operations for posts and comments.
- **Advanced Search:** Regex-based search functionality for titles, content, and tags.
- **User Profiles:** Profile management, bio updates, and avatar uploads with auto-cleanup mechanisms.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JSON Web Token (JWT)
- **File Upload:** Multer & Cloudinary
- **Security Tools:** Helmet, Express-Rate-Limit, Express-Validator

---

## Getting Started

Follow these steps to set up the project ***locally***:

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas Account
- Cloudinary Account

### Installation
1. **Clone the repository**
   ```bash
   git clone https://github.com/Salih041/selamy-api
   cd selamy-api
2. **Install dependencies**
   ```bash
   npm install
3. **Environment Variables** Create a .env file in the root directory and add the following configuration:
   ```bash
    MONGO_URL=your_db_url
    JWT_SECRET=your_super_secure_secret_key
    CLOUDINARY_CLOUD_NAME=your_cloud_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret
4. **Run the server**
   ```bash
   npm run dev
The server will start running on http://localhost:3000

---



## License
Distributed under the MIT License. See LICENSE for more information.

---

**Developed by [Salih Özbek](https://www.linkedin.com/in/salihozbk41)**
