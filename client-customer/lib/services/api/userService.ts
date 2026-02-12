import apiClient from '../axios.service';

// Types and interfaces for user-related API operations
export interface UserProfile {
    _id: string;
    phoneNumber: string;
    user_email: string;
    user_role: string;
    user_fullName: string;
    user_avatar: string;
    user_sex: boolean;
    user_status: string;
    user_dayOfBirth: string;
    role_name?: string;
}

export interface ShopInfo {
    _id: string;
    shop_userId: string;
    shop_name: string;
    shop_type: string;
    shop_logo: string;
    shop_location: {
        province: {
            province_name: string;
        };
        district: {
            district_name: string;
        };
    };
    shop_status: string;
    is_brand: boolean;
}

export interface UpdateProfilePayload {
    user_fullName?: string;
    user_email?: string;
    user_sex?: boolean;
    user_dayOfBirth?: string;
    user_avatar?: string;
}

export interface UserProfileResponse {
    message: string;
    metadata: {
        user: UserProfile;
        [key: string]: any; // For role-specific data
    };
    statusCode: number;
}

export interface ShopInfoResponse {
    message: string;
    metadata: {
        shop: ShopInfo;
    };
    statusCode: number;
}

export interface UpdateProfileResponse {
    message: string;
    metadata: UserProfile;
    statusCode: number;
}

export interface UploadAvatarResponse {
    message: string;
    metadata: UserProfile;
    statusCode: number;
}

const userService = {
    /**
     * Gets the current user's profile.
     * Requires authentication token in headers.
     * @returns {Promise<UserProfileResponse>} A promise that resolves to the user profile response.
     */
    getProfile: async (): Promise<UserProfileResponse> => {
        try {
            const response = await apiClient.get<UserProfileResponse>('/user/profile');
            return response.data;
        } catch (error) {
            console.error('Get profile error in userService:', error);
            throw error;
        }
    },

    /**
     * Gets shop information by shop ID.
     * @param {string} shopId - The ID of the shop to retrieve.
     * @returns {Promise<ShopInfoResponse>} A promise that resolves to the shop info response.
     */
    getShopInfo: async (shopId: string): Promise<ShopInfoResponse> => {
        try {
            const response = await apiClient.get<ShopInfoResponse>(`/user/shop/${shopId}`);
            return response.data;
        } catch (error) {
            console.error('Get shop info error in userService:', error);
            throw error;
        }
    },

    /**
     * Updates the current user's profile.
     * Requires authentication token in headers.
     * @param {UpdateProfilePayload} profileData - The profile data to update.
     * @returns {Promise<UpdateProfileResponse>} A promise that resolves to the update response.
     */
    updateProfile: async (profileData: UpdateProfilePayload): Promise<UpdateProfileResponse> => {
        try {
            const response = await apiClient.patch<UpdateProfileResponse>(
                '/user/profile',
                profileData
            );
            return response.data;
        } catch (error) {
            console.error('Update profile error in userService:', error);
            throw error;
        }
    },

    /**
     * Uploads a new avatar for the current user.
     * Requires authentication token in headers.
     * @param {File} avatarFile - The avatar image file to upload.
     * @returns {Promise<UploadAvatarResponse>} A promise that resolves to the upload response.
     */
    uploadAvatar: async (avatarFile: File): Promise<UploadAvatarResponse> => {
        try {
            const formData = new FormData();
            formData.append('avatar', avatarFile);

            const response = await apiClient.post<UploadAvatarResponse>(
                '/user/upload-avatar',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Upload avatar error in userService:', error);
            throw error;
        }
    }
};

export default userService;
