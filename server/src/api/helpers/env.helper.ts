export enum EnvKey {
    PORT = 'PORT',
    HOST = 'HOST',
    NODE_ENV = 'NODE_ENV',
    MONGODB_URL = 'MONGODB_URL',
    REDIS_USER = 'REDIS_USER',
    REDIS_PASSWORD = 'REDIS_PASSWORD',
    REDIS_HOST = 'REDIS_HOST',
    REDIS_PORT = 'REDIS_PORT',
    OAUTH2_USER = 'OAUTH2_USER',
    OAUTH2_CLIENT_ID = 'OAUTH2_CLIENT_ID',
    OAUTH2_CLIENT_SECRET = 'OAUTH2_CLIENT_SECRET',
    OAUTH2_REFRESH_TOKEN = 'OAUTH2_REFRESH_TOKEN',
    OAUTH2_ACCESS_TOKEN = 'OAUTH2_ACCESS_TOKEN',
    OAUTH2_CALLBACK_URL = 'OAUTH2_CALLBACK_URL',
    OPEN_ROUTE_SERVICE_API_KEY = 'OPEN_ROUTE_SERVICE_API_KEY',
    CLEAN_UP_KEY_TOKEN_CRON_TIME = 'CLEAN_UP_KEY_TOKEN_CRON_TIME',
    CLEAN_UP_PRODUCT_CRON_TIME = 'CLEAN_UP_PRODUCT_CRON_TIME',
    SYNC_INVENTORY_SKU_CRON_TIME = 'SYNC_INVENTORY_SKU_CRON_TIME',
    CLIENT_URL = 'CLIENT_URL',
    ACCESS_TOKEN_EXPIRED_TIME = 'ACCESS_TOKEN_EXPIRED_TIME',
    REFRESH_TOKEN_EXPIRED_TIME = 'REFRESH_TOKEN_EXPIRED_TIME',
}

/**
 * Get an environment variable.
 * @param key The environment variable key.
 * @param isRequired Whether the variable is required. Defaults to false.
 * @param defaultValue The default value if not found and not required. Defaults to "".
 * @returns The value of the environment variable or the default value.
 * @throws Error if the variable is required but not found.
 */
export const getEnv = (key: EnvKey | string, isRequired: boolean = false, defaultValue: string = ""): string => {
    const value = process.env[key];

    if (!value && isRequired) {
        throw new Error(`Environment variable ${key} is required but not found.`);
    }

    return value || defaultValue;
};

