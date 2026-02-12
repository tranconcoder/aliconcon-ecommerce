import api from '../axios.service';
import { API_ENDPOINTS } from './apiConfig';

export interface ProductAttribute {
  attr_name: string;
  attr_value: string;
  _id: string;
}

export interface ProductVariation {
  variation_name: string;
  variation_values: string[];
  variation_images: string[];
  _id: string;
}

export interface SPU {
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
  created_at: string;
  updated_at: string;
  __v: number;
  // SKU information is now embedded in the popular products response
  sku?: { // Make sku optional in case some products in the popular list don't have a main SKU listed directly
    _id: string;
    sku_product: string;
    sku_price: number;
    sku_stock: number;
    sku_thumb: string;
    sku_images: string[];
    sku_value: { key: string; value: string }[];
  };
}

interface PopularProductsResponse {
  statusCode: number;
  name: string;
  message: string;
  metadata: SPU[];
}

export const spuService = {
  getPopularProducts: async (): Promise<SPU[]> => {
    try {
      const response = await api.get<PopularProductsResponse>(API_ENDPOINTS.SKU.POPULAR);
      // The API now returns SPU objects with an embedded 'sku' object.
      // We'll use the sku_price and sku_thumb from the embedded sku.
      return response.data.metadata.map((spu: SPU) => ({
        ...spu,
        // Use sku_price from the embedded sku object
        product_price: spu.sku?.sku_price, 
        // Use sku_thumb from the embedded sku object if available, otherwise fallback to product_thumb
        product_thumb: spu.sku?.sku_thumb || spu.product_thumb
      }));
    } catch (error) {
      console.error('Failed to fetch popular products:', error);
      throw new Error('Không thể tải sản phẩm phổ biến.');
    }
  },
};

export default spuService; 