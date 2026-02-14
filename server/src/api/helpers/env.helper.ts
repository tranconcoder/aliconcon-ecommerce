export enum EnvKey {
    // Server
    PORT = 'PORT',
    HOST = 'HOST',
    NODE_ENV = 'NODE_ENV',

    // Database
    MONGODB_URL = 'MONGODB_URL',

    // Redis
    REDIS_USER = 'REDIS_USER',
    REDIS_PASSWORD = 'REDIS_PASSWORD',
    REDIS_HOST = 'REDIS_HOST',
    REDIS_PORT = 'REDIS_PORT',

    // Google OAuth
    OAUTH2_USER = 'OAUTH2_USER',
    OAUTH2_CLIENT_ID = 'OAUTH2_CLIENT_ID',
    OAUTH2_CLIENT_SECRET = 'OAUTH2_CLIENT_SECRET',
    OAUTH2_REFRESH_TOKEN = 'OAUTH2_REFRESH_TOKEN',
    OAUTH2_ACCESS_TOKEN = 'OAUTH2_ACCESS_TOKEN',
    OAUTH2_CALLBACK_URL = 'OAUTH2_CALLBACK_URL',

    // Open Route Service
    OPEN_ROUTE_SERVICE_API_KEY = 'OPEN_ROUTE_SERVICE_API_KEY',

    // Cron Jobs
    CLEAN_UP_KEY_TOKEN_CRON_TIME = 'CLEAN_UP_KEY_TOKEN_CRON_TIME',
    CLEAN_UP_PRODUCT_CRON_TIME = 'CLEAN_UP_PRODUCT_CRON_TIME',
    SYNC_INVENTORY_SKU_CRON_TIME = 'SYNC_INVENTORY_SKU_CRON_TIME',

    // Client
    CLIENT_URL = 'CLIENT_URL',

    // Token Expiration
    ACCESS_TOKEN_EXPIRED_TIME = 'ACCESS_TOKEN_EXPIRED_TIME',
    REFRESH_TOKEN_EXPIRED_TIME = 'REFRESH_TOKEN_EXPIRED_TIME',

    // VNPay
    VNPAY_TMN_CODE = 'VNPAY_TMN_CODE',
    VNPAY_HASH_SECRET = 'VNPAY_HASH_SECRET',
    VNPAY_URL = 'VNPAY_URL',
    VNPAY_RETURN_URL = 'VNPAY_RETURN_URL',
    VNPAY_IPN_URL = 'VNPAY_IPN_URL',
    VNPAY_API_URL = 'VNPAY_API_URL',
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

