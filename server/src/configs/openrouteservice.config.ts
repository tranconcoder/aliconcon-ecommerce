import { getEnv, EnvKey } from '../api/helpers/env.helper.js';

export const OPEN_ROUTE_SERVICE_API_KEY = getEnv(EnvKey.OPEN_ROUTE_SERVICE_API_KEY, true);
