import apiClient from '../axios.service';

// Define the structure of a single cart item (as needed by the component)
export interface CartItem {
    _id: string; // This should be the SKU ID for consistent updates/deletes
    product_name: string;
    product_thumb: string; // URL or media ID for the thumbnail
    sku_price: number; // Price of the specific SKU
    quantity: number; // Quantity in the cart
    sku_id: string; // ID of the specific SKU variant (same as _id here)
    spu_id: string; // ID of the parent SPU product (still set to empty as it's not in the new response)
    shop_id: string; // Add shop ID to the cart item
    shop_name: string; // Add shop name for display
    shop_logo?: string; // Add optional shop logo
    product_status: string; // Add product status
    cart_item_id: string; // The _id of the product entry in the cart_shop.products array
}

// Define the structure of the shop info within the new API response
interface ShopInfo {
    _id: string;
    shop_name: string;
    shop_email: string;
    shop_type: string;
    shop_logo?: string;
    shop_location?: string;
    shop_phoneNumber?: string;
    shop_status: string;
    is_brand: boolean;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    __v: number;
}

// Define the structure of a product within a shop in the new API response
interface NewCartShopProduct {
    sku: string; // SKU ID
    product_name: string;
    product_thumb: string; // Thumbnail from SKU
    cart_quantity: number; // Quantity in the cart
    product_price: number; // Price from SKU
    product_status: string; // Status from SKU
    _id: string; // This is the cart item ID
}

// Define the structure of the cart_shop object in the new API response
interface NewCartShop {
    shop: { info: ShopInfo };
    products: NewCartShopProduct[];
    _id: string; // Cart shop entry ID
}

// Define the structure of the metadata array items in the new API response
interface NewCartMetadataItem {
    _id: string; // Cart entry ID
    user: string; // User ID
    cart_shop: NewCartShop; // The cart shop object
}

// Define the structure of the overall new API response for getting the cart
interface NewGetCartApiResponse {
    statusCode: number;
    name: string;
    message: string;
    metadata: NewCartMetadataItem[];
}

interface ProductUpdate {
    id: string; // SKU ID
    isDelete?: boolean; // Optional: true if deleting this product
    status?: string; // Optional: current status
    newStatus?: string; // Optional: new status
    quantity?: number; // Optional: current quantity
    newQuantity?: number; // Optional: new quantity
}

interface ShopUpdate {
    shopId: string;
    products: ProductUpdate[];
}

// Define the structure for the update cart request body
interface UpdateCartRequestBody {
    cartShop: ShopUpdate[];
}

const CART_API_URL = '/cart'; // Base URL for cart endpoints

const cartService = {
    /**
     * Fetches the current user's cart items.
     * @returns {Promise<CartItem[]>} A promise that resolves to an array of cart items.
     */
    getCart: async (): Promise<CartItem[]> => {
        try {
            const response = await apiClient.get<NewGetCartApiResponse>(CART_API_URL);

            // Flatten the nested structure (metadata[].cart_shop.products[]) into a single array of CartItem
            const flattenedItems: CartItem[] = response.data.metadata.flatMap(
                (metadataItem: NewCartMetadataItem) =>
                    metadataItem.cart_shop.products.map((product: NewCartShopProduct) => ({
                        _id: product.sku, // Use SKU ID as the primary item ID
                        sku_id: product.sku, // SKU ID
                        product_name: product.product_name,
                        product_thumb: product.product_thumb,
                        sku_price: product.product_price,
                        quantity: product.cart_quantity,
                        shop_id: metadataItem.cart_shop.shop.info._id, // Get shop ID from info
                        shop_name: metadataItem.cart_shop.shop.info.shop_name, // Get shop name from info
                        shop_logo: metadataItem.cart_shop.shop.info.shop_logo, // Get shop logo from info
                        product_status: product.product_status,
                        spu_id: '', // SPU ID is still not available in this response structure
                        cart_item_id: product._id // Store the cart item specific ID if needed
                    }))
            );

            return flattenedItems;
        } catch (error) {
            console.error('Error fetching cart:', error);
            throw error; // Re-throw to allow the calling component/hook to handle it
        }
    },

    // You can add other cart-related functions here later, e.g.:
    // addItemToCart: async (productId: string, quantity: number, skuId?: string) => { ... }
    // updateItemQuantity: async (itemId: string, quantity: number) => { ... }
    // removeItemFromCart: async (itemId: string) => { ... }

    increaseItemQuantity: async (skuId: string, quantity: number): Promise<void> => {
        try {
            // Assuming the API endpoint for increasing quantity is POST /cart/add/:skuId/:quantity
            // This endpoint seems to handle adding a product or increasing its quantity if it exists.
            // We only need to send the *additional* quantity to add, not the new total.
            // However, the server's addToCart takes the total quantity to set if the item exists.
            // Let's stick to the server controller's logic which expects the quantity to ADD.
            // So, we'll pass the quantity difference (newQuantity - currentQuantity). This requires
            // knowing the current quantity in the component, which we'll handle there.
            // For now, let's assume this function will be called with the *amount to increase by*.
            // We'll adjust the component logic accordingly.

            // **Correction:** Looking at the server's `addToCart` service function, it checks if the product exists in the cart and *adds* the `quantity` parameter to the existing quantity. So, the API should be called with the *amount to increase*. Let's name this function `addItemQuantity` for clarity.
            await apiClient.post(`${CART_API_URL}/add/${skuId}/${quantity}`);
        } catch (error) {
            console.error('Error increasing item quantity:', error);
            throw error;
        }
    },

    decreaseItemQuantity: async (skuId: string): Promise<void> => {
        try {
            // Assuming the API endpoint for decreasing quantity is PATCH /cart/decrease/:skuId
            // The server's decreaseCartQuantity seems to decrease by one.
            await apiClient.patch(`${CART_API_URL}/decrease/${skuId}`);
        } catch (error) {
            console.error('Error decreasing item quantity:', error);
            throw error;
        }
    },

    removeItemFromCart: async (skuId: string): Promise<void> => {
        try {
            // Assuming the API endpoint for removing an item is DELETE /cart/:skuId or similar.
            // Let's assume DELETE /cart/:skuId based on the deleteProductFromCart service function.
            await apiClient.delete(`${CART_API_URL}/product/${skuId}`);
        } catch (error) {
            console.error('Error removing item from cart:', error);
            throw error;
        }
    },

    /**
     * Updates the user's cart with new quantities, statuses, or deletes items.
     * @param {UpdateCartRequestBody} data The cart data to update.
     * @returns {Promise<any>} A promise that resolves with the updated cart data.
     */
    updateCart: async (data: UpdateCartRequestBody): Promise<any> => {
        try {
            const response = await apiClient.patch(`${CART_API_URL}/update`, data);
            return response.data.metadata; // Assuming metadata contains the updated cart structure
        } catch (error) {
            console.error('Error updating cart:', error);
            throw error; // Re-throw to allow the calling component/hook to handle it
        }
    }
};

export default cartService;
