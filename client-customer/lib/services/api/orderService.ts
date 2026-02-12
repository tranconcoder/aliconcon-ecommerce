import apiClient from '../axios.service';

export interface CreateOrderRequest {
    paymentType: 'cod' | 'vnpay';
}

export interface CreateOrderResponse {
    message: string;
    metadata: Array<{
        _id: string;
        customer: string;
        customer_address: string;
        customer_avatar: string;
        customer_email: string;
        customer_full_name: string;
        customer_phone: string;
        shop_id: string;
        shop_name: string;
        products_info: Array<{
            sku_id: string;
            product_name: string;
            quantity: number;
            thumb: string;
            price: number;
            price_raw: number;
            sku_variations: Array<{
                key: string;
                value: string;
            }>;
        }>;
        payment_type: string;
        payment_paid: boolean;
        price_to_payment: number;
        price_total_raw: number;
        total_discount_price: number;
        fee_ship: number;
        discount?: {
            discount_id: string;
            discount_name: string;
            discount_code: string;
            discount_value: number;
            discount_type: string;
        };
        shop_discount?: {
            discount_id: string;
            discount_name: string;
            discount_code: string;
            discount_value: number;
            discount_type: string;
        };
        order_status: string;
        created_at: string;
        updated_at: string;
    }>;
}

export interface CancelOrderResponse {
    message: string;
    metadata: {
        _id: string;
        order_status: string;
        updated_at: string;
        refund_info?: {
            refund_id: string;
            refund_amount: number;
            refund_status: 'pending' | 'completed' | 'failed';
        };
    };
}

export interface CreateOrderWithVNPayPaymentRequest {
    bankCode?: string;
}

export interface CreateOrderWithVNPayPaymentResponse {
    message: string;
    metadata: {
        orders: Array<{
            _id: string;
            order_status: string;
            price_to_payment: number;
        }>;
        paymentUrl: string;
        totalAmount: number;
        txnRef: string;
    };
}

export interface OrderHistoryItem {
    _id: string;
    customer: string;
    customer_address: string;
    customer_avatar: string;
    customer_email: string;
    customer_full_name: string;
    customer_phone: string;
    shop_id: string;
    shop_name: string;
    shop_logo?: string;
    warehouses_info?: Array<{
        warehouse_id: string;
        warehouse_name: string;
        warehouse_address: string;
        distance_km: number;
    }>;
    products_info: Array<{
        sku_id: string;
        product_name: string;
        quantity: number;
        thumb: string;
        price: number;
        price_raw: number;
        sku_variations: Array<{
            key: string;
            value: string;
        }>;
    }>;
    payment_type: string;
    payment_paid: boolean;
    payment_date?: string;
    price_to_payment: number;
    price_total_raw: number;
    total_discount_price: number;
    fee_ship: number;
    order_status: string;
    discount?: {
        discount_id: string;
        discount_name: string;
        discount_code: string;
        discount_value: number;
        discount_type: string;
    };
    shop_discount?: {
        discount_id: string;
        discount_name: string;
        discount_code: string;
        discount_value: number;
        discount_type: string;
    };
    created_at: string;
    updated_at: string;
    refund_info?: {
        refund_id: string;
        refund_amount: number;
        refund_status: 'pending' | 'completed' | 'failed';
    };
    cancellation_reason?: string;
    rejection_reason?: string;
    cancelled_at?: string;
    rejected_at?: string;
    rejected_by_shop?: boolean;
}

export interface GetOrderHistoryParams {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'created_at' | 'updated_at' | 'price_to_payment';
    sortOrder?: 'asc' | 'desc';
    paymentType?: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface GetOrderHistoryResponse {
    message: string;
    metadata: {
        orders: OrderHistoryItem[];
        pagination: PaginationInfo;
    };
}

class OrderService {
    /**
     * Create a new order
     */
    async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
        const response = await apiClient.post<CreateOrderResponse>('/order/create', request);
        return response.data;
    }

    /**
     * Get order history for the authenticated user
     */
    async getOrderHistory(params?: GetOrderHistoryParams): Promise<GetOrderHistoryResponse> {
        const queryParams: any = {};

        if (params?.status && params.status !== 'all') {
            queryParams.status = params.status;
        }
        if (params?.page) {
            queryParams.page = params.page;
        }
        if (params?.limit) {
            queryParams.limit = params.limit;
        }
        if (params?.search) {
            queryParams.search = params.search;
        }
        if (params?.sortBy) {
            queryParams.sortBy = params.sortBy;
        }
        if (params?.sortOrder) {
            queryParams.sortOrder = params.sortOrder;
        }
        if (params?.paymentType) {
            queryParams.paymentType = params.paymentType;
        }
        if (params?.dateFrom) {
            queryParams.dateFrom = params.dateFrom;
        }
        if (params?.dateTo) {
            queryParams.dateTo = params.dateTo;
        }

        const response = await apiClient.get<GetOrderHistoryResponse>('/order/history', {
            params: queryParams
        });
        return response.data;
    }

    /**
     * Get order detail by ID
     */
    async getOrderById(orderId: string): Promise<{ message: string; metadata: OrderHistoryItem }> {
        const response = await apiClient.get<{ message: string; metadata: OrderHistoryItem }>(`/order/${orderId}`);
        return response.data;
    }

    /**
     * Cancel an order
     */
    async cancelOrder(orderId: string): Promise<CancelOrderResponse> {
        const response = await apiClient.patch<CancelOrderResponse>(`/order/${orderId}/cancel`);
        return response.data;
    }

    /**
     * Create orders with VNPay payment and get payment URL
     */
    async createOrderWithVNPayPayment(request: CreateOrderWithVNPayPaymentRequest): Promise<CreateOrderWithVNPayPaymentResponse> {
        const response = await apiClient.post<CreateOrderWithVNPayPaymentResponse>('/order/create-vnpay-payment', request);
        return response.data;
    }
}

const orderService = new OrderService();
export default orderService; 