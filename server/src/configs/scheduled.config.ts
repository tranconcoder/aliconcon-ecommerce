import LoggerService from '@/services/logger.service.js';
import { getEnv, EnvKey } from '@/helpers/env.helper';

export const TIMEZONE = 'Asia/Ho_Chi_Minh';

const CRON_TIME_DEV = '* * * * *';

// Cleanup key token scheduled
export const CLEAN_UP_KEY_TOKEN_CRON_TIME =
    getEnv(EnvKey.CLEAN_UP_KEY_TOKEN_CRON_TIME, false, CRON_TIME_DEV);

// Cleanup product remove failed scheduled
export const CLEAN_UP_PRODUCT_CRON_TIME = getEnv(EnvKey.CLEAN_UP_PRODUCT_CRON_TIME, false, CRON_TIME_DEV);

// Sync inventory stock with SKU scheduled - every minute
export const SYNC_INVENTORY_SKU_CRON_TIME = getEnv(EnvKey.SYNC_INVENTORY_SKU_CRON_TIME, false, '* * * * *');

export const getCronOptions = (options: service.scheduled.arguments.GetCronOption) => {
    return {
        timeZone: TIMEZONE,
        start: false,
        waitForCompletion: true,
        errorHandler: (error: unknown) => {
            let message = 'Error: cleanup key token';

            if (error instanceof Error) {
                message = error.message;
            }

            LoggerService.getInstance().error(message);
        },
        ...options
    } as service.scheduled.arguments.GetCronOption;
};
