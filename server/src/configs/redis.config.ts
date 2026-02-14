import ms from 'ms';
import { getEnv, EnvKey } from '../api/helpers/env.helper.js';

export const PESSIMISTIC_EXPIRE_TIME = ms('10 seconds');
export const PESSIMISTIC_QUERY_TIME = ms('7 seconds');
export const PESSIMISTIC_WAITING_TIME = ms('30 ms');
export const PESSIMISTIC_RETRY_TIMES = ms('50 ms');

export const REDIS_CONFIG = {
    username: getEnv(EnvKey.REDIS_USER, true),
    password: getEnv(EnvKey.REDIS_PASSWORD, true),
    socket: {
        host: getEnv(EnvKey.REDIS_HOST, true),
        port: Number(getEnv(EnvKey.REDIS_PORT, true))
    }
}