import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

// Function to generate a unique username from email
const generateUniqueUsername = async (email) => {
    // Extract part before '@' and convert to lowercase
    let baseUsername = email.split('@')[0].toLowerCase();
    
    // Keep only letters, numbers, and underscores (matching User model regex)
    baseUsername = baseUsername.replace(/[^a-z0-9_]/g, '');
    
    let username = baseUsername;
    let isUnique = false;
    let counter = 1;

    // Append numbers to make it unique if it already exists
    while (!isUnique) {
        const existingUser = await User.findOne({ username });
        if (!existingUser) {
            isUnique = true;
        } else {
            username = `${baseUsername}_${counter}`;
            counter++;
        }
    }
    return username;
};

// Common login/register algorithm for both Google and Github
const handleOAuthUser = async (profile, provider, done) => {
    try {
        // Extract email address
        const email = profile.emails[0].value.toLowerCase();
        
        // Check if a user with this email already exists
        let user = await User.findOne({ email });

        if (user) {
            // User exists from local registration. Link OAuth profile (Account Linking)
            if (provider === 'google' && !user.googleId) {
                user.googleId = profile.id;
                user.authProvider = user.authProvider === 'local' ? 'google' : user.authProvider;
                await user.save();
            } else if (provider === 'github' && !user.githubId) {
                user.githubId = profile.id;
                user.authProvider = user.authProvider === 'local' ? 'github' : user.authProvider;
                await user.save();
            }
            return done(null, user);
        }

        // User doesn't exist, create a new record
        const uniqueUsername = await generateUniqueUsername(email);

        user = new User({
            username: uniqueUsername,
            email: email,
            displayName: profile.displayName || uniqueUsername,
            isVerified: true, // Treat email as verified since it comes from OAuth
            authProvider: provider,
            googleId: provider === 'google' ? profile.id : null,
            githubId: provider === 'github' ? profile.id : null
        });

        await user.save();
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
};

// ---------------- Google Strategy ----------------
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID || 'DUMMY_ID_GEREKLI',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'DUMMY_SECRET_GEREKLI',
            callbackURL: '/api/oauth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
            await handleOAuthUser(profile, 'google', done);
        }
    )
);

// ---------------- GitHub Strategy ----------------
passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID || 'DUMMY_ID_GEREKLI',
            clientSecret: process.env.GITHUB_CLIENT_SECRET || 'DUMMY_SECRET_GEREKLI',
            callbackURL: '/api/oauth/github/callback',
            scope: ['user:email'] // Request email explicitly from GitHub
        },
        async (accessToken, refreshToken, profile, done) => {
            // If user has no email or it is hidden on GitHub
            if (!profile.emails || profile.emails.length === 0) {
                return done(new Error("No email found from GitHub. E-posta adresi gizli veya yok."), null);
            }
            await handleOAuthUser(profile, 'github', done);
        }
    )
);

export default passport;
