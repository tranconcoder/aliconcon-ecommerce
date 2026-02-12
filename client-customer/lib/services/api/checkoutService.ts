import apiClient from '../axios.service';

export interface ShopDiscount {
    discountCode: string;
    shopId: string;
}

export interface CheckoutRequest {
    discountCode?: string;
    shopsDiscount: ShopDiscount[];
    addressId: string;
}

export interface CheckoutResponse {
    message: string;
    metadata: {
        user: string;
        total_price_raw: number;
        total_fee_ship: number;
        total_discount_admin_price: number;
        total_discount_shop_price: number;
        total_discount_price: number;
        total_checkout: number;
        discount?: {
            discount_id: string;
            discount_code: string;
            discount_name: string;
            discount_type: string;
            discount_value: number;
        };
        shops_info: Array<{
            shop_id: string;
            shop_name: string;
            discount?: {
                discount_id: string;
                discount_code: string;
                discount_name: string;
                discount_type: string;
                discount_value: number;
            };
            fee_ship: number;
            total_discount_price: number;
            total_price_raw: number;
            products_info: Array<{
                id: string;
                name: string;
                quantity: number;
                thumb: string;
                price: number;
                price_raw: number;
            }>;
        }>;
        ship_info?: string;
        _id: string;
        createdAt: string;
        updatedAt: string;
    };
}

class CheckoutService {
    /**
     * Create a checkout with selected items and address
     */
    async checkout(request: CheckoutRequest): Promise<CheckoutResponse> {
        const response = await apiClient.post<CheckoutResponse>('/checkout', request);
        return response.data;
    }

    /**
     * Get user's current checkout data
     */
    async getCheckout(): Promise<CheckoutResponse> {
        const response = await apiClient.get<CheckoutResponse>('/checkout');
        return response.data;
    }
}

const checkoutService = new CheckoutService();
export default checkoutService; 