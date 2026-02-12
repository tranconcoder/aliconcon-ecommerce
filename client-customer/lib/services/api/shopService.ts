import apiClient from '../axios.service';

export interface ShopLocation {
  _id?: string; // Added _id as it's in the response
  province: {
    _id?: string; // Added _id
    province_name: string;
  };
  district: {
    _id?: string; // Added _id
    district_name: string;
  };
  // street_address?: string; // if you have this detail
}

// Define the Shop interface based on potential needs for a profile page
// This can be expanded with more details as needed (e.g., ratings, banner image, social links etc.)
export interface Shop {
  _id: string;
  shop_userId: string; // Added based on response
  shop_name: string;
  // shop_email: string; // Removing as not in getShopInfo response
  shop_logo: string; // Media ID
  // shop_description?: string; // Keep if it might come from other sources or future updates
  shop_location: ShopLocation; // Now strictly ShopLocation based on response
  // shop_phoneNumber: string; // Removing as not in getShopInfo response
  shop_type: string; // Changed to required string as in response
  shop_status: string; 
  is_brand: boolean;  
  // shop_banner_image?: string; // Example of an additional field
  // products_count?: number;
  // follower_count?: number;
  // created_at?: string;
}

// Interface for SKU value pair
export interface SkuValue {
  key: string;
  value: string;
  // _id?: string; // if present
}

// Interface for the SKU object within a product
export interface SkuDetails {
  _id: string;
  sku_product: string;
  sku_price: number;
  sku_stock: number;
  sku_thumb: string; // Media ID
  sku_images: string[]; // Array of Media IDs
  sku_value: SkuValue[];
}

// Interface for each product item returned by /sku/shop/:shopId
export interface ShopProductSku {
  _id: string; // This is the SPU id
  product_name: string;
  product_quantity: number; // This seems to be SPU total quantity
  product_description: string;
  product_category: string; // Category ID
  product_shop: string; // Shop ID
  product_rating_avg: number;
  product_slug: string;
  product_thumb: string; // SPU thumbnail (Media ID)
  product_images: string[]; // SPU images (Array of Media IDs)
  sku: SkuDetails; // The specific SKU details
  sold_count?: number; // Added optional sold_count
}

// Response type for getProductsByShopId
interface GetProductsByShopIdResponse {
  statusCode: number;
  name: string;
  message: string;
  metadata: ShopProductSku[];
}

// Updated to match the provided API response structure
interface GetShopByIdResponse {
  message: string;
  metadata: {
    shop: Shop; // Shop data is nested under 'shop'
  };
  statusCode?: number; 
  name?: string; // Added 'name' field from response
}

const shopService = {
  /**
   * Fetches a single shop by its ID.
   * @param {string} shopId - The ID of the shop to fetch.
   * @returns {Promise<Shop>} A promise that resolves to the shop data.
   */
  getShopById: async (shopId: string): Promise<Shop> => {
    try {
      // The endpoint in user.service.ts is getShopInfo(id: string), 
      // which implies it might be under a /user route if called by user service, or a /shop route.
      // Let's assume a direct /shop/:id endpoint for now as that's more RESTful for a shop resource.
      // If it's actually /user/shop/:id, that should be reflected.
      // The user provided sample refers to server/src/api/services/user.service.ts getShopInfo function
      // This function seems to be callable. The route that calls this is not specified but usually it is /user/shop/:id or /shop/:id
      // I will use /user/shop/:id based on the file path provided by user
      const response = await apiClient.get<GetShopByIdResponse>(`/user/shop/${shopId}`);
      
      if (response.data && response.data.metadata && response.data.metadata.shop) {
        return response.data.metadata.shop; // Access nested shop object
      }
      throw new Error('Shop data not found in API response structure.');
    } catch (error) {
      console.error(`Error fetching shop with ID ${shopId}:`, error);
      throw error; 
    }
  },

  /**
   * Fetches all SKUs/products for a given shop.
   * @param {string} shopId - The ID of the shop.
   * @returns {Promise<ShopProductSku[]>} A promise that resolves to a list of shop products with SKU details.
   */
  getProductsByShopId: async (shopId: string): Promise<ShopProductSku[]> => {
    try {
      const response = await apiClient.get<GetProductsByShopIdResponse>(`/sku/shop/${shopId}`);
      if (response.data && response.data.metadata) {
        return response.data.metadata;
      }
      throw new Error('Products for shop not found or API response structure incorrect.');
    } catch (error) {
      console.error(`Error fetching products for shop ID ${shopId}:`, error);
      throw error;
    }
  },

  // You might add other shop-related API calls here, e.g.:
  // getProductsByShopId: async (shopId: string, params?: any) => { ... }
};

export default shopService; 