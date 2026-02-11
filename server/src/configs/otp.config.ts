import ms from "ms"
import { getEnv } from "../api/helpers/env.helper.js";

export const OTP_EXPIRATION_TIME = ms('5 minutes');

export const OTP_RETRY_TIME = ms('30 seconds');

export const OTP_EMAIL = getEnv('OAUTH2_USER', true);
export const OTP_CLIENT_ID = getEnv('OAUTH2_CLIENT_ID', true);
export const OTP_CLIENT_SECRET = getEnv('OAUTH2_CLIENT_SECRET', true);
export const OTP_REFRESH_TOKEN = getEnv('OAUTH2_REFRESH_TOKEN', true);
export const OTP_ACCESS_TOKEN = getEnv('OAUTH2_ACCESS_TOKEN', false);
