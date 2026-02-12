import { EnvKey, getEnv } from "@/helpers/env.helper";

export const CLIENT_URL = getEnv(EnvKey.CLIENT_URL, false, 'http://localhost:3000');
