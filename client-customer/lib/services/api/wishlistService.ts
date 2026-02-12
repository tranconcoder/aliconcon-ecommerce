import apiClient from '../axios.service'; // Assuming a configured axios instance

// Define a more accurate SPU type based on the provided API response
export interface SPU {
  _id: string;
  product_name: string;
  product_quantity: number;
  product_description: string;
  product_category: string; // Assuming this is an ID
  product_shop: string; // Assuming this is an ID
  product_rating_avg: number;
  product_slug: string;
  product_thumb: string; // Media ID
  product_images: string[]; // Array of Media IDs
  product_attributes: Array<{
    attr_id?: string; // Optional, as not in all examples
    attr_name: string;
    attr_value: string;
    _id?: string; // Can be present
  }>;
  product_variations: Array<{
    variation_id?: string; // Optional
    variation_name: string;
    variation_values: string[];
    variation_images?: string[]; // Array of Media IDs, optional
    _id?: string; // Can be present
  }>;
  is_draft: boolean;
  is_publish: boolean;
  created_at: string;
  updated_at: string;
  __v?: number;
}

export type WishlistItem = SPU; // Wishlist now contains SPU details

interface WishlistApiResponse {
  metadata: Array<{
    _id: string;
    user: string;
    products: SPU[];
    createdAt: string;
    updatedAt: string;
    __v?: number;
  }>;
  // statusCode, message etc. can be added if needed for robust error handling based on API contract
}

const WISHLIST_API_URL = '/wishlist'; // Base URL for wishlist endpoints

// getWishlist now directly returns the array of populated products (SKUs)
const getWishlist = async (): Promise<WishlistItem[]> => {
  try {
    const response = await apiClient.get<WishlistApiResponse>(WISHLIST_API_URL);
    if (response.data.metadata && response.data.metadata.length > 0) {
      return response.data.metadata[0].products;
    }
    return []; 
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    // Consider re-throwing or returning a value that indicates error to the caller
    // For example, throw new Error("Failed to fetch wishlist"); or return [];
    throw error; // Propagate error so UI can handle it
  }
};

// addToWishlist might need to change if the response after adding is different
// For now, assuming it still returns the specific item added or a confirmation.
// If it returns the whole updated list of products, this could be ProductSku[]
const addToWishlist = async (productId: string): Promise<WishlistItem[]> => {
  try {
    // Backend POST /wishlist/add/:productId is expected to return the updated WishlistApiResponse
    const response = await apiClient.post<WishlistApiResponse>(`${WISHLIST_API_URL}/add/${productId}`);
     if (response.data.metadata && response.data.metadata.length > 0) {
      return response.data.metadata[0].products;
    }
    // If metadata is present but products array is missing, or metadata is empty array
    if (response.data.metadata && response.data.metadata[0] && !response.data.metadata[0].products) {
        // This case could mean the wishlist exists but the product wasn't added, or an empty products array was returned.
        // Depending on API contract, this might be an empty wishlist after adding the first item (if it was initially null/undefined)
        // or it could be an error.
        // For now, assuming if metadata[0] exists, products should too. If products is empty, it's an empty wishlist.
        return []; 
    }
    if (response.data.metadata && response.data.metadata.length === 0){
        return []; // Wishlist might be empty
    }
    console.error('Unexpected API response format after adding to wishlist:', response.data);
    throw new Error("Failed to add item to wishlist or API response format is incorrect");
  } catch (error) {
    console.error(`Error adding product ${productId} to wishlist:`, error);
    throw error;
  }
};

// removeFromWishlist remains largely the same in terms of parameters and expected outcome (void or confirmation)
const removeFromWishlist = async (productId: string): Promise<WishlistItem[]> => {
  try {
    // Backend POST /wishlist/remove/:productId is expected to return the updated WishlistApiResponse
    // Changed from DELETE to POST to align with backend returning the updated list.
    const response = await apiClient.delete<WishlistApiResponse>(`${WISHLIST_API_URL}/remove/${productId}`);
     if (response.data.metadata && response.data.metadata.length > 0) {
      return response.data.metadata[0].products;
    }
    // Handle cases where the wishlist becomes empty or product was not found for removal
    if (response.data.metadata && response.data.metadata.length === 0) {
        return []; // Wishlist is now empty
    }
    if (response.data.metadata && response.data.metadata[0] && response.data.metadata[0].products.length === 0){
        return []; // Wishlist is now empty (products array is empty)
    }
    console.error('Unexpected API response format after removing from wishlist:', response.data);
    throw new Error("Failed to remove item from wishlist or API response format is incorrect");
  } catch (error) {
    console.error(`Error removing product ${productId} from wishlist:`, error);
    throw error;
  }
};

export const wishlistService = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
}; 