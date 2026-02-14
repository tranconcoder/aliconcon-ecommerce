import { getEnv, EnvKey } from '../api/helpers/env.helper.js';

export const VNPAY_TMN_CODE = getEnv(EnvKey.VNPAY_TMN_CODE, true);
export const VNPAY_HASH_SECRET = getEnv(EnvKey.VNPAY_HASH_SECRET, true);
export const VNPAY_URL = getEnv(EnvKey.VNPAY_URL, true);
export const VNPAY_RETURN_URL = getEnv(EnvKey.VNPAY_RETURN_URL, true);
export const VNPAY_IPN_URL = getEnv(EnvKey.VNPAY_IPN_URL, true);
export const VNPAY_API_URL = getEnv(EnvKey.VNPAY_API_URL, true);
