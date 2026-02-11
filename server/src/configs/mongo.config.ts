import { getEnv } from '../api/helpers/env.helper.js';

export const MONGO_URL = getEnv('MONGODB_URL', true);
export const MONGO_MIN_POOL_SIZE = 100;
export const MONGO_MAX_POOL_SIZE = 500;
