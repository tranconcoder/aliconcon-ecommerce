
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import AuthService from '@/services/auth.service.js';
import dotenv from 'dotenv';
import { getEnv, EnvKey } from '@/helpers/env.helper';
dotenv.config();

passport.use(
    new GoogleStrategy(
        {
            clientID: getEnv(EnvKey.OAUTH2_CLIENT_ID, true),
            clientSecret: getEnv(EnvKey.OAUTH2_CLIENT_SECRET, true),
            callbackURL: getEnv(EnvKey.OAUTH2_CALLBACK_URL, true)
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const user = await AuthService.upsertUserFromGoogle(profile);
                return done(null, user);
            } catch (error) {
                return done(error, false);
            }
        }
    )
);

passport.serializeUser((user: any, done) => {
    done(null, user);
});

passport.deserializeUser((user: any, done) => {
    done(null, user);
});

export default passport;
