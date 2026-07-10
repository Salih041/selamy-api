import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

// E-postadan benzersiz username türeten fonksiyon
const generateUniqueUsername = async (email) => {
    // '@' işaretinden önceki kısmı alıp küçük harfe çevir
    let baseUsername = email.split('@')[0].toLowerCase();
    
    // Sadece harf, rakam ve alt çizgiye izin ver (User modelindeki regex'e uyması için)
    baseUsername = baseUsername.replace(/[^a-z0-9_]/g, '');
    
    let username = baseUsername;
    let isUnique = false;
    let counter = 1;

    // Veritabanında eşleşme oldukça sonuna sayı ekleyerek benzersiz yap
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

// Hem Google hem Github için ortak giriş/kayıt algoritması
const handleOAuthUser = async (profile, provider, done) => {
    try {
        // E-posta adresini al
        const email = profile.emails[0].value.toLowerCase();
        
        // Bu e-postayla kayıtlı kullanıcı var mı kontrol et
        let user = await User.findOne({ email });

        if (user) {
            // Kullanıcı var ama daha önce normal kayıt olmuş. Profilini güncelliyoruz (Account Linking)
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

        // Kullanıcı daha önce hiç kayıt olmamış, yeni kayıt açıyoruz
        const uniqueUsername = await generateUniqueUsername(email);

        user = new User({
            username: uniqueUsername,
            email: email,
            displayName: profile.displayName || uniqueUsername,
            isVerified: true, // OAuth'tan geldiği için e-posta zaten doğrulanmış kabul ediyoruz
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

// ---------------- Google Stratejisi ----------------
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

// ---------------- GitHub Stratejisi ----------------
passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID || 'DUMMY_ID_GEREKLI',
            clientSecret: process.env.GITHUB_CLIENT_SECRET || 'DUMMY_SECRET_GEREKLI',
            callbackURL: '/api/oauth/github/callback',
            scope: ['user:email'] // GitHub'dan özel olarak e-postayı da istememiz gerekiyor
        },
        async (accessToken, refreshToken, profile, done) => {
            // Eğer kullanıcının GitHub'da hiç e-postası yoksa veya gizliyse
            if (!profile.emails || profile.emails.length === 0) {
                return done(new Error("No email found from GitHub. E-posta adresi gizli veya yok."), null);
            }
            await handleOAuthUser(profile, 'github', done);
        }
    )
);

export default passport;
