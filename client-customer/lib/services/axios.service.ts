import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { BACKEND_API_URL } from '../configs/server.config';

/* -------------------------------------------------------------------------- */
/*                                AXIOS SERVICE                               */
/* -------------------------------------------------------------------------- */

/**
 * AxiosService - A Singleton class to manage the global Axios instance.
 * 
 * This service handles:
 * - Base URL configuration.
 * - Global request/response interceptors.
 * - Consistent error handling for API calls.
 */
class AxiosService {
  /** The single instance of AxiosService */
  private static instance: AxiosService;
  /** The configured Axios instance */
  private axiosInstance: AxiosInstance;

  /**
   * Private constructor to prevent direct instantiation.
   * Initializes the Axios client and interceptors.
   */
  private constructor() {
    // Create axios instance with default configurations
    this.axiosInstance = axios.create({
      baseURL: BACKEND_API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.initializeInterceptors();
  }

  /* -------------------------------------------------------------------------- */
  /*                                PUBLIC METHODS                              */
  /* -------------------------------------------------------------------------- */

  /**
   * Gets the singleton instance of AxiosService.
   * @returns {AxiosService} The AxiosService instance.
   */
  public static getInstance(): AxiosService {
    if (!AxiosService.instance) {
      AxiosService.instance = new AxiosService();
    }
    return AxiosService.instance;
  }

  /**
   * Gets the configured Axios client.
   * @returns {AxiosInstance} The Axios instance.
   */
  public getClient(): AxiosInstance {
    return this.axiosInstance;
  }

  /* -------------------------------------------------------------------------- */
  /*                               PRIVATE METHODS                              */
  /* -------------------------------------------------------------------------- */

  /**
   * Configures global request and response interceptors.
   */
  private initializeInterceptors() {
    /* --- Request Interceptor --- */
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Access localStorage safely for Client-Side Rendering (Next.js)
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

        if (token) {
          // Remove potential JSON quotes from token
          const cleanToken = token.replace(/"/g, '');
          config.headers.Authorization = `Bearer ${cleanToken}`;
        }

        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    /* --- Response Interceptor --- */
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // You can handle global response logic here (e.g. data transformation)
        return response;
      },
      (error: AxiosError) => {
        // Global error logging
        console.error('Response Error:', error.response?.data || error.message);
        
        // Return a rejected promise to be handled by the calling service
        return Promise.reject(error);
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                               EXPORTS                                      */
/* -------------------------------------------------------------------------- */

// Export the underlying Axios client for a simpler API interface
const apiClient = AxiosService.getInstance().getClient();
export default apiClient;

 