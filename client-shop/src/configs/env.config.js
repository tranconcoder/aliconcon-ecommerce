/**
 * Environment configuration for the application
 */

export const EnvKey = {
    API_URL: 'REACT_APP_API_URL',
    NODE_ENV: 'NODE_ENV'
};

/**
 * Get environment variable by key
 * @param {string} key 
 * @returns {string}
 */
export const getEnvKey = (key, isRequired = false, defaultValue = null) => {
    if (isRequired && !process.env[key]) {
        throw new Error(`CRITICAL: ${key} is not defined in the environment!`);
    }

    return process.env[key] || defaultValue;
};

// Standardized constants
export const NODE_ENV = getEnvKey(EnvKey.NODE_ENV, false, 'development');

// Mandatory API URL check (Required in production)
export const API_URL = getEnvKey(
    EnvKey.API_URL, 
    NODE_ENV === 'production', 
    NODE_ENV === 'development' ? 'http://localhost:4000' : null
);

if (!API_URL && NODE_ENV === 'development') {
    console.warn('⚠️ REACT_APP_API_URL is missing. Using default development URL.');
}

// Backward compatibility or secondary exports
export const API_URL_HTTPS = API_URL; 
export const DISCOUNT_ITEM_PER_PAGE = 30;

// Debug logging
console.log('Environment Config Initialized:', {
    NODE_ENV,
    API_URL,
    isSecure: API_URL.startsWith('https')
});
