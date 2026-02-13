import axios from 'axios';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './jwt.config';
import { API_URL } from './env.config';

// Create axios instance
const axiosClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000
});

// Authentication token storage
let accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
// refreshToken is managed via localStorage directly in the interceptor
// eslint-disable-next-line no-unused-vars
let refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

// Flag to prevent multiple refresh token requests
let isRefreshing = false;
let refreshSubscribers = [];

// Callback function for logout (will be set by the app)
let logoutCallback = null;

// Function to set logout callback
export const setLogoutCallback = (callback) => {
    logoutCallback = callback;
};

// Function to push failed requests to queue when refreshing token
const subscribeTokenRefresh = (callback) => {
    refreshSubscribers.push(callback);
};

// Function to retry failed requests with new token
const onRefreshed = (newToken) => {
    refreshSubscribers.forEach((callback) => callback(newToken));
    refreshSubscribers = [];
};

// Helper function to clear auth state
const clearAuthState = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    accessToken = null;
    refreshToken = null;
    isRefreshing = false;
    refreshSubscribers = [];
    delete axiosClient.defaults.headers.common['Authorization'];
};

// Add request interceptor to attach the token to all requests
axiosClient.interceptors.request.use(
    (config) => {
        // Get the current token in case it was updated
        accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

        // Skip adding token for login, sign-up, and refresh token routes
        const isAuthRoute =
            config.url.includes('/auth/login') ||
            config.url.includes('/auth/sign-up') ||
            config.url.includes('/auth/new-token');

        if (accessToken && !isAuthRoute) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
        }

        // If the request data is FormData, let the browser set the Content-Type automatically
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type']; // Let the browser set it to multipart/form-data with boundary
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle token refresh
axiosClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // If error is unauthorized and we haven't tried refreshing token yet
        const currentRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (
            error.response?.status === 403 &&
            error.response.data.name === 'Token error' &&
            currentRefreshToken &&
            !originalRequest._retry
        ) {
            // If not already refreshing token
            if (!isRefreshing) {
                isRefreshing = true;
                originalRequest._retry = true;

                try {
                    // Call the refresh token endpoint
                    const response = await axios.post(
                        `${API_URL}/auth/new-token`,
                        {
                            refreshToken: currentRefreshToken
                        },
                        {
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );

                    // Get new token pair from response
                    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
                        response.data.metadata;

                    // Update tokens in storage
                    localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
                    localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
                    accessToken = newAccessToken;

                    // Update token in axios defaults
                    axiosClient.defaults.headers.common[
                        'Authorization'
                    ] = `Bearer ${newAccessToken}`;

                    // Process queued requests with new token
                    onRefreshed(newAccessToken);
                    isRefreshing = false;

                    // Retry original request with new token
                    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    return axiosClient(originalRequest);
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);

                    // Clear auth state
                    clearAuthState();

                    // Use callback to logout user if available
                    if (logoutCallback) {
                        logoutCallback();
                    } else {
                        // Fallback to redirect if no callback is set
                        window.location.href = '/login';
                    }

                    return Promise.reject(refreshError);
                }
            } else {
                // If already refreshing, add request to queue
                return new Promise((resolve, reject) => {
                    subscribeTokenRefresh((newToken) => {
                        if (newToken) {
                            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                            resolve(axiosClient(originalRequest));
                        } else {
                            reject(error);
                        }
                    });
                });
            }
        }
        return Promise.reject(error);
    }
);

// Function to update tokens (can be called from other parts of the app)
export const setAuthTokens = (newAccessToken, newRefreshToken) => {
    accessToken = newAccessToken;
    refreshToken = newRefreshToken;
    localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
    axiosClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
};

export default axiosClient;
