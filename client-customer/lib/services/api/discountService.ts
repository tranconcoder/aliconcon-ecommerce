import apiClient from '../axios.service';

export interface Discount {
    _id: string;
    discount_name: string;
    discount_code: string;
    discount_description?: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    discount_max_value?: number;
    discount_min_order_cost?: number;
    discount_start_at: string;
    discount_end_at: string;
    discount_count?: number;
    discount_used_count: number;
    discount_shop: string;
    discount_skus?: string[];
    is_admin_voucher: boolean;
    is_available: boolean;
    is_publish: boolean;
    is_apply_all_product: boolean;
    created_at: string;
    updated_at: string;
}

export interface GetDiscountsInShopParams {
    shopId: string;
    limit?: number;
    page?: number;
}

export interface GetDiscountsInShopResponse {
    message: string;
    metadata: Discount[];
}

export const discountService = {
    // Get all discount codes available in a shop
    getDiscountCodesInShop: async (params: GetDiscountsInShopParams): Promise<Discount[]> => {
        const { shopId, limit = 10, page = 1 } = params;
        const response = await apiClient.get<GetDiscountsInShopResponse>(
            `/discount/shop/all/${shopId}?limit=${limit}&page=${page}`
        );
        return response.data.metadata;
    },

    // Get discount by ID
    getDiscountById: async (discountId: string): Promise<Discount> => {
        const response = await apiClient.get<{ message: string; metadata: Discount }>(
            `/discount/${discountId}`
        );
        return response.data.metadata;
    },

    // Get discount amount for products
    getDiscountAmount: async (params: {
        discountCode: string;
        products: Array<{ id: string; quantity: number }>;
    }): Promise<{
        totalPrice: number;
        totalDiscount: number;
        totalPayment: number;
    }> => {
        const response = await apiClient.post<{
            message: string;
            metadata: {
                totalPrice: number;
                totalDiscount: number;
                totalPayment: number;
            };
        }>('/discount/amount', params);
        return response.data.metadata;
    },

    // Save a discount
    saveDiscount: async (discountId: string): Promise<void> => {
        await apiClient.post(`/saved-discount/${discountId}`);
    },

    // Unsave a discount
    unsaveDiscount: async (discountId: string): Promise<void> => {
        await apiClient.delete(`/saved-discount/${discountId}`);
    },

    // Get user saved discount IDs
    getSavedDiscountIds: async (): Promise<string[]> => {
        const response = await apiClient.get<{ message: string; metadata: string[] }>(
            '/saved-discount/ids'
        );
        return response.data.metadata;
    },

    // Check if discount is saved
    isDiscountSaved: async (discountId: string): Promise<boolean> => {
        const response = await apiClient.get<{ message: string; metadata: { isSaved: boolean } }>(
            `/saved-discount/check/${discountId}`
        );
        return response.data.metadata.isSaved;
    },

    // Get user saved discounts
    getSavedDiscounts: async (params?: { limit?: number; page?: number }) => {
        const { limit = 20, page = 1 } = params || {};
        const response = await apiClient.get<{
            message: string;
            metadata: {
                discounts: Array<{
                    discount_id: Discount;
                    saved_at: string;
                }>;
                totalCount: number;
                currentPage: number;
                totalPages: number;
            };
        }>(`/saved-discount?limit=${limit}&page=${page}`);
        return response.data.metadata;
    }
};

export default discountService; 