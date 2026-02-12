import apiClient from '../axios.service'; // apiClient is our axiosInstance
import { BACKEND_API_URL } from '../../configs/server.config'; // For potential direct image URLs if not using mediaService
import { Category } from './categoryService';

// Define a type for the product data if you have one, e.g.:
// interface Product {
//   id: string;
//   name: string;
//   price: number;
//   // ...other properties
// }

// Define Shop interface (based on previous ProductShop)
export interface ShopReference {
  _id: string; // Assuming shop ID is a string
  shop_name: string;
  shop_logo: string; // Media ID for the logo
}

// Define ProductDetail interface
export interface ProductAttribute {
  attr_name: string; // Attribute name (e.g., "Brand", "Color")
  attr_value: string; // Attribute value (e.g., "Apple", "Red")
  _id: string; // Attribute ID
}

export interface ProductDetail {
  _id: string; // Changed from id: number to _id: string for MongoDB
  product_name: string;
  product_description: string;
  product_price: number;
  product_thumb: string; // Media ID for thumbnail
  product_images: string[]; // Array of media IDs for other images
  product_quantity: number; // Stock
  shop: ShopReference; // Embedded shop information
  product_attributes: ProductAttribute[];
  product_ratingsAverage?: number; // Optional
  sold_count?: number; // Added
  product_category?: string; // Category ID, added
  isNew?: boolean; // From previous Product interface
  salePrice?: number; // Optional, from previous Product interface
  discount?: number;  // Optional, from previous Product interface
  // Add other fields as necessary, e.g., variations, specifications
}

// Example type for product creation data (could be different from Product type)
// interface CreateProductDto {
//   name: string;
//   price: number;
//   // ...other properties
// }

// New interfaces for the actual API response structure
export interface ProductVariation {
  variation_name: string;
  variation_values: string[];
  variation_images: string[];
  _id: string;
}

export interface SpuSelect {
  _id: string;
  product_name: string;
  product_quantity: number;
  product_description: string;
  product_category: string;
  product_shop: string;
  product_sold: number;
  product_rating_avg: number;
  product_slug: string;
  product_thumb: string;
  product_images: string[];
  product_attributes: ProductAttribute[];
  product_variations: ProductVariation[];
  is_draft: boolean;
  is_publish: boolean;
}

export interface SkuOther {
  _id: string;
  sku_product: string;
  sku_price: number;
  sku_stock: number;
  sku_thumb: string;
  sku_images: string[];
  sku_tier_idx: number[];
}

export interface ProductDetailResponse {
  _id: string;
  sku_product: string;
  sku_price: number;
  sku_stock: number;
  sku_thumb: string;
  sku_images: string[];
  sku_tier_idx: number[];
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  __v: number;
  spu_select: SpuSelect;
  category: Category[];
  sku_others: SkuOther[];
}

// New interface for SKU-based product detail response
export interface ProductSkuDetail {
  _id: string; // SPU ID
  product_name: string;
  product_quantity: number;
  product_description: string;
  product_category: string;
  product_shop: string; // Shop ID (might need to be expanded)
  product_rating_avg?: number;
  product_slug: string;
  product_thumb: string; // Media ID for SPU
  product_images: string[]; // Media IDs for SPU
  product_attributes: ProductAttribute[];
  product_variations: Array<{
    variation_name: string;
    variation_values: string[];
    _id: string;
  }>;
  shop?: ShopReference; // Expanded shop information if available
  category?: Category[]; // Category information from lookup
  sku: {
    _id: string; // SKU ID
    sku_product: string; // SPU ID (links back to parent SPU)
    sku_price: number;
    sku_stock: number;
    sku_thumb: string; // Media ID for this specific SKU
    sku_images: string[]; // Media IDs for this specific SKU
    sku_tier_idx: number[]; // Tier index array for variations
    sku_value: { key: string; value: string }[];
  };
  sold_count?: number;
  isNew?: boolean;
  salePrice?: number;
  discount?: number;
}

// New interface for products from /sku list
export interface ProductSku {
  _id: string; // SPU ID
  product_name: string;
  product_quantity: number; // Overall SPU quantity. SKU stock is separate.
  product_description: string;
  product_shop: string; // Shop ID
  product_sold: number; // Add this field from API response
  product_rating_avg: number; // Make this required as it's in API response
  product_slug: string;
  product_thumb: string; // Media ID for SPU
  product_images: string[]; // Media IDs for SPU
  product_variations: ProductVariation[]; // Product variations for tier index mapping - make required
  category: {
    category_name: string;
    category_icon: string;
    category_description: string;
  }; // Add category field from API response
  sku: {
    _id: string; // SKU ID
    sku_product: string; // SPU ID (links back to parent SPU)
    sku_price: number;
    sku_stock: number;
    sku_thumb: string; // Media ID for this specific SKU
    sku_images: string[]; // Media IDs for this specific SKU
    sku_tier_idx: number[]; // Tier index array for variations
    sku_value: { key: string; value: string }[];
  };
  sold_count?: number;
}

// Import types from backend - Note: In a real app, these would be shared types
// For now, we'll use a simplified version that matches the Zod schema
export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categories?: string; // Comma-separated category IDs (will be converted to array on backend)
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  minRating?: number;
  shopId?: string;
  sortBy?: 'featured' | 'newest' | 'price-low' | 'price-high' | 'rating' | 'sold';
  sortOrder?: 'asc' | 'desc';
}

const productService = {
  async getAllProducts(filters?: ProductFilters): Promise<ProductSku[]> {
    try {
      // Build query parameters
      const params = new URLSearchParams();

      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.categories) params.append('categories', filters.categories);
      if (filters?.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
      if (filters?.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
      if (filters?.inStock) params.append('inStock', 'true');
      if (filters?.minRating !== undefined) params.append('minRating', filters.minRating.toString());
      if (filters?.shopId) params.append('shopId', filters.shopId);
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

      const queryString = params.toString();
      const url = queryString ? `/sku?${queryString}` : '/sku';

      const response = await apiClient.get(url);
      // console.log("getAllProducts response:", response.data.metadata);
      return response.data.metadata || []; // Ensure it returns an array even if metadata is null/undefined
    } catch (error) {
      console.error("Error fetching all products:", error);
      throw error;
    }
  },

  /**
   * Fetches a single product by its ID.
   * @param {string} productId - The ID of the product to fetch.
   * @returns {Promise<any>} A promise that resolves to the product data.
   */
  getProductById: async (productId: string): Promise<ProductDetail> => {
    try {
      // The endpoint is often /spu/detail/:id for public product details
      const response = await apiClient.get(`/spu/detail/${productId}`);
      // Assuming the actual product data is nested under metadata.product
      if (response.data && response.data.metadata && response.data.metadata.product) {
        return response.data.metadata.product as ProductDetail;
      } else if (response.data && response.data.metadata) {
        // Fallback if product is directly under metadata
        return response.data.metadata as ProductDetail;
      }
      // If the structure is just response.data, uncomment below and adjust
      // return response.data as ProductDetail;
      throw new Error("Product data not found in the expected format");
    } catch (error) {
      console.error(`Error fetching product with ID ${productId}:`, error);
      throw error;
    }
  },

  /**
   * Creates a new product.
   * @param {any} productData - The data for the new product. Use a specific DTO type if available.
   * @returns {Promise<any>} A promise that resolves to the created product data.
   */
  createProduct: async (productData: any /* CreateProductDto */) => {
    try {
      const response = await apiClient.post('/products', productData);
      return response.data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  /**
   * Updates an existing product.
   * @param {string} productId - The ID of the product to update.
   * @param {any} productData - The updated data for the product. Use a specific DTO type if available.
   * @returns {Promise<any>} A promise that resolves to the updated product data.
   */
  updateProduct: async (productId: string, productData: any /* Partial<Product> or specific DTO */) => {
    try {
      const response = await apiClient.put(`/products/${productId}`, productData);
      return response.data;
    } catch (error) {
      console.error(`Error updating product with ID ${productId}:`, error);
      throw error;
    }
  },

  /**
   * Deletes a product by its ID.
   * @param {string} productId - The ID of the product to delete.
   * @returns {Promise<void>} A promise that resolves when the product is deleted.
   */
  deleteProduct: async (productId: string) => {
    try {
      const response = await apiClient.delete(`/products/${productId}`);
      return response.data; // Or just return nothing if the API returns 204 No Content
    } catch (error) {
      console.error(`Error deleting product with ID ${productId}:`, error);
      throw error;
    }
  },

  /**
   * Fetches a single SKU by its ID.
   * @param {string} skuId - The ID of the SKU to fetch.
   * @returns {Promise<ProductDetailResponse>} A promise that resolves to the SKU data.
   */
  getSkuById: async (skuId: string): Promise<ProductDetailResponse> => {
    try {
      const response = await apiClient.get(`/sku/id/${skuId}`);
      if (response.data && response.data.metadata && response.data.metadata.length > 0) {
        // Return the first item from metadata array as-is
        return response.data.metadata[0] as ProductDetailResponse;
      }
      throw new Error("SKU data not found in the expected format");
    } catch (error) {
      console.error(`Error fetching SKU with ID ${skuId}:`, error);
      throw error;
    }
  },

  /**
   * Fetches SKUs by category ID.
   * @param {string} categoryId - The ID of the category.
   * @param {number} limit - The maximum number of SKUs to fetch.
   * @returns {Promise<ProductSku[]>} A promise that resolves to the SKUs data.
   */
  getSkusByCategory: async (categoryId: string, limit: number = 8): Promise<ProductSku[]> => {
    try {
      const response = await apiClient.get(`/sku?category=${categoryId}&limit=${limit}`);
      return response.data.metadata || [];
    } catch (error) {
      console.error(`Error fetching SKUs for category ${categoryId}:`, error);
      throw error;
    }
  },


};

export default productService;