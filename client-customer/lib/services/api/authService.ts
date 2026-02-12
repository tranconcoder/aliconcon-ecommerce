import apiClient from '../axios.service';

// It's good practice to define types/interfaces for your API payloads and responses.
// Example (you should adjust these to match your actual API):
export interface LoginPayload {
  // email?: string;
  phoneNumber?: string; // Assuming login can be via phone or email
  password: string;
}

export interface RegisterPayload {
  user_fullName: string;
  phoneNumber: string;
  user_email: string;
  password: string;
  // confirmPassword?: string; // Usually handled client-side
}

export interface AuthResponse {
  message: string;
  metadata: {
    user: {
      _id: string;
      id: string;
      user_fullName: string;
      user_email: string;
      phoneNumber: string;
      user_avatar: string;
      user_role: string;
      user_sex: boolean;
      user_status: string;
      user_dayOfBirth: string; // Added to match User type
    };
    token: {
      accessToken: string;
      refreshToken: string;
    };
    shop?: {
      _id: string;
      shop_userId: string;
      shop_name: string;
      shop_email: string;
      shop_type: string;
      shop_logo: string;
      shop_certificate: string;
      shop_location: string;
      shop_phoneNumber: string;
      shop_description?: string;
      shop_owner_fullName: string;
      shop_owner_email: string;
      shop_owner_phoneNumber: string;
      shop_owner_cardID: string;
      shop_status: string;
      is_brand: boolean;
      is_deleted: boolean;
      created_at: string;
      updated_at: string;
      __v: number;
    };
  };
  statusCode: number;
  // ...any other fields your auth response might have
}

export interface SendOTPPayload {
  email: string;
}

export interface VerifyOTPPayload {
  email: string;
  otp: string;
}

export interface ForgotPasswordPayload {
  email: string;
  newPassword: string;
  accessToken?: string;
}

const authService = {
  /**
   * Logs in a user.
   * @param {LoginPayload} credentials - The user's login credentials.
   * @returns {Promise<AuthResponse>} A promise that resolves to the authentication response.
   */
  login: async (credentials: LoginPayload): Promise<AuthResponse> => {
    try {
      // Make sure your API endpoint for login is correct, e.g., '/auth/login' or '/users/login'
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      return response.data;
    } catch (error) {
      console.error('Login error in authService:', error);
      throw error; // Re-throw to allow the calling component/hook to handle it
    }
  },

  /**
   * Registers a new user.
   * @param {RegisterPayload} userData - The data for the new user.
   * @returns {Promise<AuthResponse>} A promise that resolves to the registration response.
   */
  register: async (userData: RegisterPayload): Promise<AuthResponse> => {
    try {
      // Make sure your API endpoint for registration is correct, e.g., '/auth/sign-up' or '/users/register'
      const response = await apiClient.post<AuthResponse>('/auth/sign-up', userData);
      return response.data;
    } catch (error) {
      console.error('Registration error in authService:', error);
      throw error;
    }
  },

  /**
   * Logs out a user.
   * Implement this if your backend has a logout endpoint (e.g., to invalidate refresh tokens).
   * @returns {Promise<any>} A promise that resolves on successful logout.
   */
  logout: async () => {
    try {
      // const response = await apiClient.post('/auth/logout');
      // console.log('Logout successful');
      // return response.data;
      // Typically, client-side logout involves clearing tokens/session data.
      // This function can be expanded or primarily handled client-side depending on backend.
      return Promise.resolve(); // Placeholder
    } catch (error) {
      console.error('Logout error in authService:', error);
      throw error;
    }
  },

  /**
   * Send OTP to email for password reset
   */
  async sendOTP(payload: SendOTPPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/otp/send', payload);
    return response.data;
  },

  /**
   * Verify OTP code
   */
  async verifyOTP(payload: VerifyOTPPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/otp/verify', payload);
    return response.data;
  },

  /**
   * Reset password with token
   */
  async forgotPassword(payload: ForgotPasswordPayload): Promise<AuthResponse> {
    const headers = payload.accessToken 
      ? { Authorization: `Bearer ${payload.accessToken}` }
      : {};
      
    const response = await apiClient.patch<AuthResponse>(
      '/auth/forgot-password', 
      { email: payload.email, newPassword: payload.newPassword },
      { headers }
    );
    return response.data;
  },

  // You might add other auth-related functions here, e.g.:
  // refreshToken: async (refreshToken: string) => { ... }
  // forgotPassword: async (email: string) => { ... }
  // resetPassword: async (token: string, newPassword: string) => { ... }
  // getCurrentUserProfile: async () => { ... }
};

export default authService; 