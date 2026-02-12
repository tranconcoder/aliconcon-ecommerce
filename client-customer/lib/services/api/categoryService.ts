import axiosInstance from "../axios.service";

export interface Category {
  _id: string;
  category_name: string;
  category_icon: string; // Media ID for the icon
  category_slug: string;
  category_description: string;
  category_parent?: string; // Parent category ID
  category_level: number;
  category_order: number;
  category_product_count: number;
  is_active: boolean;
}

interface GetCategoriesResponse {
  message: string;
  metadata: Category[]; 
  // Or adapt if the structure is different, e.g., just Category[]
}

const API_URL = "/category"; // Relative to the axiosInstance baseURL

export const categoryService = {
  getAllCategories: async (): Promise<Category[]> => {
    try {
      // Adjust the response data access based on actual API structure
      // For example, if the categories are directly in response.data
      // or response.data.metadata
      const response = await axiosInstance.get<GetCategoriesResponse>(API_URL);
      // Check if metadata exists and is an array, otherwise return empty array or handle error
      return response.data.metadata || []; 
    } catch (error) {
      console.error("Error fetching categories:", error);
      // It's often better to throw the error and let the caller handle UI updates
      // or return an empty array/specific error object
      throw error;
    }
  },
  
  // Add other category-related API calls here if needed
  // e.g., getCategoryById, createCategory, etc.
}; 