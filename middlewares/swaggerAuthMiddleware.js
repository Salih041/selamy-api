// filepath: middlewares/swaggerAuthMiddleware.js
const swaggerAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.set('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
        return res.status(401).json({
            message: 'Authentication required'
        });
    }

    try {
        const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
        const [username, password] = credentials.split(':');

        const validUsername = process.env.SWAGGER_USERNAME;
        const validPassword = process.env.SWAGGER_PASSWORD;

        if (username === validUsername && password === validPassword) {
            return next();
        }

        console.log("Invalid user : " ,username)
        return res.status(403).json({
            message: 'Invalid credentials'
        });
    } catch (error) {
        return res.status(400).json({
            message: 'Malformed authorization header'
        });
    }
};

export default swaggerAuthMiddleware;