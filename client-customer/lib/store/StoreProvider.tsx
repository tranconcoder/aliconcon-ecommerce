'use client';

import { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { store, AppDispatch } from './store';
import {
    loginStart,
    loginSuccess,
    logout,
    User,
    Shop,
} from './slices/userSlice';
import axiosClient from '@/lib/services/axios.service'; // Assuming you have this configured
import { fetchCart } from './slices/cartSlice';

interface StoreProviderProps {
    children: React.ReactNode;
}

// Define a type for the expected profile API response
interface ProfileApiResponse {
    metadata: {
        user: User;
        shop?: Shop;
        // Potentially new tokens if the profile endpoint itself can refresh (less common)
        token?: {
            accessToken: string;
            refreshToken: string;
        };
    };
}

// Define a type for the expected refresh token API response
interface RefreshTokenApiResponse {
    metadata: {
        token: {
            accessToken: string;
            refreshToken: string;
        };
        user: User; // Often refresh token endpoints return the user object too
        shop?: Shop;
    };
}

export default function StoreProvider({ children }: StoreProviderProps) {
    const storeRef = useRef<typeof store | null>(null);

    if (!storeRef.current) {
        storeRef.current = store;
    }

    useEffect(() => {
        const initAuth = async () => {
            if (!storeRef.current) return;
            const dispatch = storeRef.current.dispatch as AppDispatch;

            const accessToken = localStorage.getItem('accessToken');
            let currentRefreshToken = localStorage.getItem('refreshToken');

            if (accessToken && currentRefreshToken) {
                console.log('StoreProvider: Tokens found. Attempting to fetch profile.');
                dispatch(loginStart());
                try {
                    // Attempt to fetch profile with current access token
                    const profileResponse = await axiosClient.get<ProfileApiResponse>(
                        '/user/profile',
                        {
                            headers: { Authorization: `Bearer ${accessToken}` }
                        }
                    );

                    const userData = profileResponse.data.metadata.user;
                    const shopData = profileResponse.data.metadata.shop;
                    let newAccessToken = accessToken; // Assume current token is fine
                    let newRefreshToken = currentRefreshToken; // Assume current token is fine

                    // If profile endpoint also returns new tokens (e.g. after auto-refresh)
                    if (profileResponse.data.metadata.token) {
                        newAccessToken = profileResponse.data.metadata.token.accessToken;
                        newRefreshToken = profileResponse.data.metadata.token.refreshToken;
                        localStorage.setItem('accessToken', newAccessToken);
                        localStorage.setItem('refreshToken', newRefreshToken);
                    }

                    dispatch(fetchCart());

                    dispatch(
                        loginSuccess({
                            user: userData,
                            shop: shopData,
                            token: { accessToken: newAccessToken, refreshToken: newRefreshToken }
                        })
                    );

                    console.log('StoreProvider: Profile fetch successful.');
                } catch (error: any) {
                    console.warn(
                        'StoreProvider: Profile fetch failed with current token.',
                        error.response?.data || error.message
                    );
                    if (error.response?.status === 401 && currentRefreshToken) {
                        console.log('StoreProvider: Unauthorized. Attempting token refresh.');
                        try {
                            const refreshResponse = await axiosClient.post<RefreshTokenApiResponse>(
                                '/auth/new-token',
                                { refreshToken: currentRefreshToken }
                            );
                            const newTokens = refreshResponse.data.metadata.token;
                            const refreshedUser = refreshResponse.data.metadata.user;
                            const refreshedShop = refreshResponse.data.metadata.shop;

                            localStorage.setItem('accessToken', newTokens.accessToken);
                            localStorage.setItem('refreshToken', newTokens.refreshToken);
                            currentRefreshToken = newTokens.refreshToken; // Update for potential subsequent use if needed

                            console.log(
                                'StoreProvider: Token refresh successful. Re-fetching profile.'
                            );
                            // Re-fetch profile with new token (could also just trust data from refresh endpoint)
                            // For consistency, we can dispatch loginSuccess directly if refresh gives all data
                            dispatch(
                                loginSuccess({
                                    user: refreshedUser,
                                    shop: refreshedShop,
                                    token: newTokens
                                })
                            );
                        } catch (refreshError: any) {
                            console.error(
                                'StoreProvider: Token refresh failed.',
                                refreshError.response?.data || refreshError.message
                            );
                            dispatch(logout()); // This clears state and localStorage via the slice
                        }
                    } else {
                        // Not a 401 or no refresh token, so just logout
                        console.error(
                            'StoreProvider: Profile fetch failed (not 401 or no refresh token).'
                        );
                        dispatch(logout());
                    }
                }
            } else {
                console.log(
                    'StoreProvider: No tokens found in localStorage. Ensuring logged out state.'
                );
                dispatch(logout());
            }
        };

        if (storeRef.current) {
            // Ensure store is initialized before running effect
            initAuth();
        }
    }, []); // Empty dependency array ensures this runs only once on mount

    return <Provider store={storeRef.current!}>{children}</Provider>;
}
