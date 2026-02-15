'use client';

import type { RootState } from '@/lib/store/store';
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/lib/store/hooks';
import { mediaService } from '@/lib/services/api/mediaService';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Trash2,
    MinusSquare,
    PlusSquare,
    ShoppingCartIcon,
    Tag,
    X,
    MapPin,
    ChevronDown,
    Crown,
    Store
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    fetchCart,
    addItemToCart,
    decreaseItemQuantity,
    removeItemFromCart,
    updateItemStatus
} from '@/lib/store/slices/cartSlice';
import { fetchUserAddresses } from '@/lib/store/slices/addressSlice';
import checkoutService, { CheckoutRequest, ShopDiscount, CheckoutResponse } from '@/lib/services/api/checkoutService';
import orderService, { CreateOrderRequest } from '@/lib/services/api/orderService';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function CartPage() {
    const { isAuthenticated, isLoading: isAuthLoading } = useSelector(
        (state: RootState) => state.user
    );
    const { items: cartItems, isLoading, error } = useSelector((state: RootState) => state.cart);
    const {
        addresses,
        defaultAddress,
        isLoading: isAddressLoading
    } = useSelector((state: RootState) => state.address);
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const router = useRouter();

    // State cho việc chọn sản phẩm
    const [activeItems, setActiveItems] = useState<string[]>([]);

    // State cho admin discount (global discount)
    const [adminDiscountCode, setAdminDiscountCode] = useState<string>('');

    // State cho shop discounts (per shop)
    const [shopDiscountCodes, setShopDiscountCodes] = useState<Record<string, string>>({});

    // State cho địa chỉ giao hàng
    const [selectedAddressId, setSelectedAddressId] = useState<string>('');

    // State cho checkout và order
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [isOrdering, setIsOrdering] = useState(false);
    const [checkoutData, setCheckoutData] = useState<CheckoutResponse | null>(null);

    // Fetch addresses when component mounts
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchUserAddresses());
        }
    }, [isAuthenticated, dispatch]);

    // Set default address when addresses are loaded
    useEffect(() => {
        if (defaultAddress && !selectedAddressId) {
            setSelectedAddressId(defaultAddress._id);
        }
    }, [defaultAddress, selectedAddressId]);

    // Sync active items with cart items' status on load and when items change
    useEffect(() => {
        const activeItemIds = cartItems
            .filter((item) => item.product_status === 'active')
            .map((item) => item.sku_id);
        setActiveItems(activeItemIds);
    }, [cartItems]);

    // Reset checkout data when items or active items change to avoid showing stale data
    useEffect(() => {
        setCheckoutData(null);
    }, [cartItems, activeItems]);

    const calculateSubtotal = () => {
        return cartItems
            .filter((item) => activeItems.includes(item.sku_id))
            .reduce((total, item) => {
                return total + item.sku_price * item.quantity;
            }, 0);
    };

    const calculateTotalItems = () => {
        return cartItems
            .filter((item) => activeItems.includes(item.sku_id))
            .reduce((total, item) => total + item.quantity, 0);
    };

    const groupedItems = useMemo(() => {
        return cartItems.reduce((acc, item) => {
            if (!acc[item.shop_id]) {
                acc[item.shop_id] = {
                    shopId: item.shop_id,
                    shopName: item.shop_name,
                    shopLogo: item.shop_logo,
                    items: []
                };
            }
            acc[item.shop_id].items.push(item);
            return acc;
        }, {} as Record<string, { shopId: string; shopName: string; shopLogo?: string; items: typeof cartItems }>);
    }, [cartItems]);

    const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
        const currentItem = cartItems.find((item) => item.sku_id === itemId);
        if (!currentItem || newQuantity < 1) return;

        const quantityDiff = newQuantity - currentItem.quantity;

        if (quantityDiff === 0) return;

        try {
            if (quantityDiff > 0) {
                await dispatch(addItemToCart({ skuId: itemId, quantity: quantityDiff })).unwrap();
            } else {
                if (quantityDiff === -1) {
                    await dispatch(decreaseItemQuantity(itemId)).unwrap();
                } else {
                    console.warn(
                        'Direct quantity input changes > -1 are not fully supported with the current decrease API and thunk.'
                    );
                    dispatch(fetchCart());
                    return;
                }
            }
        } catch (error) {
            console.error(`Failed to update quantity for item ${itemId}:`, error);
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        try {
            await dispatch(removeItemFromCart(itemId)).unwrap();
            // Xóa item khỏi danh sách đã chọn nếu có
            setActiveItems((prev) => prev.filter((id) => id !== itemId));
        } catch (error) {
            console.error(`Failed to remove item ${itemId}:`, error);
        }
    };

    // Xử lý chọn/bỏ chọn sản phẩm
    const handleSelectItem = async (itemId: string, checked: boolean) => {
        // Update local state first for immediate UI feedback
        if (checked) {
            setActiveItems((prev) => [...prev, itemId]);
        } else {
            setActiveItems((prev) => prev.filter((id) => id !== itemId));
        }

        // Find the item to get shop ID
        const item = cartItems.find((cartItem) => cartItem.sku_id === itemId);
        if (item) {
            try {
                // Update the item status via API
                const newStatus = checked ? 'active' : 'inactive';
                await dispatch(
                    updateItemStatus({
                        skuId: itemId,
                        shopId: item.shop_id,
                        newStatus
                    })
                ).unwrap();
            } catch (error) {
                console.error(`Failed to update item status for ${itemId}:`, error);
                // Revert local state on error
                if (checked) {
                    setActiveItems((prev) => prev.filter((id) => id !== itemId));
                } else {
                    setActiveItems((prev) => [...prev, itemId]);
                }
            }
        }
    };

    // Xử lý chọn/bỏ chọn tất cả sản phẩm trong shop
    const handleSelectShop = async (shopItems: typeof cartItems, checked: boolean) => {
        const shopItemIds = shopItems.map((item) => item.sku_id);

        // Update local state first for immediate UI feedback
        if (checked) {
            setActiveItems((prev) => [...new Set([...prev, ...shopItemIds])]);
        } else {
            setActiveItems((prev) => prev.filter((id) => !shopItemIds.includes(id)));
        }

        // Update each item's status via API
        const shopId = shopItems[0]?.shop_id;
        if (shopId) {
            try {
                const newStatus = checked ? 'active' : 'inactive';
                // Update all items in the shop
                await Promise.all(
                    shopItems.map((item) =>
                        dispatch(
                            updateItemStatus({
                                skuId: item.sku_id,
                                shopId: shopId,
                                newStatus
                            })
                        ).unwrap()
                    )
                );
            } catch (error) {
                console.error(`Failed to update shop items status:`, error);
                // Revert local state on error
                if (checked) {
                    setActiveItems((prev) => prev.filter((id) => !shopItemIds.includes(id)));
                } else {
                    setActiveItems((prev) => [...new Set([...prev, ...shopItemIds])]);
                }
            }
        }
    };

    // Kiểm tra xem shop có được chọn toàn bộ không
    const isShopFullyActive = (shopItems: typeof cartItems) => {
        const shopItemIds = shopItems.map((item) => item.sku_id);
        return shopItemIds.every((id) => activeItems.includes(id));
    };

    // Kiểm tra xem shop có được chọn một phần không
    const isShopPartiallyActive = (shopItems: typeof cartItems) => {
        const shopItemIds = shopItems.map((item) => item.sku_id);
        return shopItemIds.some((id) => activeItems.includes(id)) && !isShopFullyActive(shopItems);
    };

    // Xử lý chọn/bỏ chọn tất cả sản phẩm trong giỏ hàng
    const handleSelectAll = async (checked: boolean) => {
        // Update local state first for immediate UI feedback
        if (checked) {
            const allItemIds = cartItems.map((item) => item.sku_id);
            setActiveItems(allItemIds);
        } else {
            setActiveItems([]);
        }

        // Update all items' status via API
        try {
            const newStatus = checked ? 'active' : 'inactive';
            // Group items by shop and update them
            const shopGroups = Object.values(groupedItems);
            await Promise.all(
                shopGroups.flatMap((shop) =>
                    shop.items.map((item) =>
                        dispatch(
                            updateItemStatus({
                                skuId: item.sku_id,
                                shopId: shop.shopId,
                                newStatus
                            })
                        ).unwrap()
                    )
                )
            );
        } catch (error) {
            console.error(`Failed to update all items status:`, error);
            // Revert local state on error
            if (checked) {
                setActiveItems([]);
            } else {
                const allItemIds = cartItems.map((item) => item.sku_id);
                setActiveItems(allItemIds);
            }
        }
    };

    // Kiểm tra xem tất cả sản phẩm có được chọn không
    const isAllActive = cartItems.length > 0 && activeItems.length === cartItems.length;

    // Handle applying discounts and calculating checkout
    const handleApplyDiscounts = async () => {
        if (!selectedAddressId) {
            toast({
                title: 'Lỗi',
                description: 'Vui lòng chọn địa chỉ giao hàng để tính toán mã giảm giá',
                variant: 'destructive'
            });
            return;
        }

        if (activeItems.length === 0) {
            toast({
                title: 'Thông báo',
                description: 'Vui lòng chọn sản phẩm để tính toán mã giảm giá',
                variant: 'default'
            });
            return;
        }

        setIsCheckingOut(true);
        try {
            const shopsDiscount: ShopDiscount[] = [];
            const activeShops = new Set(
                cartItems
                    .filter((item) => activeItems.includes(item.sku_id))
                    .map((item) => item.shop_id)
            );

            activeShops.forEach((shopId) => {
                const shopDiscountCode = shopDiscountCodes[shopId];
                shopsDiscount.push({
                    shopId,
                    discountCode: shopDiscountCode || ''
                });
            });

            const checkoutRequest: CheckoutRequest = {
                addressId: selectedAddressId,
                shopsDiscount,
                discountCode: adminDiscountCode || undefined
            };

            const response = await checkoutService.checkout(checkoutRequest);
            setCheckoutData(response);

            toast({
                title: 'Đã áp dụng',
                description: 'Thông tin giảm giá đã được cập nhật',
                variant: 'default'
            });
        } catch (error: any) {
            console.error('Apply discounts error:', error);
            toast({
                title: 'Lỗi',
                description: error.response?.data?.message || 'Không thể áp dụng mã giảm giá',
                variant: 'destructive'
            });
        } finally {
            setIsCheckingOut(false);
        }
    };

    // Handle checkout
    const handleCheckout = async () => {
        if (!selectedAddressId) {
            toast({
                title: 'Lỗi',
                description: 'Vui lòng chọn địa chỉ giao hàng',
                variant: 'destructive'
            });
            return;
        }

        if (activeItems.length === 0) {
            toast({
                title: 'Lỗi',
                description: 'Vui lòng chọn ít nhất một sản phẩm',
                variant: 'destructive'
            });
            return;
        }

        setIsCheckingOut(true);
        try {
            // Prepare shop discounts from shop discount codes
            const shopsDiscount: ShopDiscount[] = [];
            const activeShops = new Set(
                cartItems
                    .filter((item) => activeItems.includes(item.sku_id))
                    .map((item) => item.shop_id)
            );

            activeShops.forEach((shopId) => {
                const shopDiscountCode = shopDiscountCodes[shopId];
                shopsDiscount.push({
                    shopId,
                    discountCode: shopDiscountCode || ''
                });
            });

            const checkoutRequest: CheckoutRequest = {
                addressId: selectedAddressId,
                shopsDiscount,
                discountCode: adminDiscountCode || undefined
            };

            console.log('🛒 Checkout request:', checkoutRequest);

            const checkoutResult = await checkoutService.checkout(checkoutRequest);

            toast({
                title: 'Thành công!',
                description: `Tính toán đơn hàng thành công. Tổng tiền: ${checkoutResult.metadata.total_checkout.toLocaleString(
                    'vi-VN'
                )}₫`,
                variant: 'default'
            });

            // Navigate to checkout/payment page
            router.push('/checkout');
        } catch (error: any) {
            console.error('Checkout error:', error);
            toast({
                title: 'Lỗi',
                description:
                    error.response?.data?.message || 'Có lỗi xảy ra khi tính toán đơn hàng',
                variant: 'destructive'
            });
        } finally {
            setIsCheckingOut(false);
        }
    };

    // Handle order creation
    const handleCreateOrder = async (paymentType: 'cod' | 'vnpay' = 'cod') => {
        setIsOrdering(true);
        try {
            const orderRequest: CreateOrderRequest = {
                paymentType
            };

            const orderResult = await orderService.createOrder(orderRequest);
            console.log('Order result:', orderResult);

            // Handle multiple orders response
            const orders = orderResult.metadata;
            const orderCount = orders.length;

            if (orderCount === 1) {
                toast({
                    title: 'Thành công',
                    description: 'Đặt hàng thành công'
                });
            } else {
                toast({
                    title: 'Thành công',
                    description: `Đặt ${orderCount} đơn hàng thành công`
                });
            }

            // Refresh cart after successful order
            dispatch(fetchCart());
        } catch (error: any) {
            console.error('Order error:', error);
            toast({
                title: 'Lỗi',
                description: error.response?.data?.message || 'Có lỗi xảy ra khi đặt hàng',
                variant: 'destructive'
            });
        } finally {
            setIsOrdering(false);
        }
    };

    if (isLoading || isAuthLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8 text-center text-blue-800">
                    Giỏ hàng của bạn
                </h1>
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4">
                        {Array.from({ length: 2 }).map((_, index) => (
                            <Card
                                key={index}
                                className="flex items-center p-4 gap-4 shadow-md rounded-lg"
                            >
                                <Skeleton className="h-24 w-24 rounded-md" />
                                <div className="flex-grow space-y-2">
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-4 w-1/4" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-8 w-8" />
                                    <Skeleton className="h-8 w-12" />
                                    <Skeleton className="h-8 w-8" />
                                </div>
                                <Skeleton className="h-8 w-8" />
                            </Card>
                        ))}
                    </div>
                    <Card className="md:col-span-1 p-6 shadow-lg rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50">
                        <CardTitle className="text-xl font-semibold mb-6 text-blue-700">
                            Tóm tắt đơn hàng
                        </CardTitle>
                        <div className="space-y-3 mb-6">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-5 w-full" />
                        </div>
                        <Skeleton className="h-12 w-full rounded-md" />
                    </Card>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <ShoppingCartIcon className="mx-auto h-16 w-16 text-red-400 mb-4" />
                <p className="text-xl text-red-500">{error}</p>
                {!isAuthenticated && (
                    <Button asChild className="mt-6 bg-blue-600 hover:bg-blue-700">
                        <Link href="/auth/login">Đăng nhập</Link>
                    </Button>
                )}
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="min-h-[60vh] flex flex-col justify-center items-center text-center">
                <ShoppingCartIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-2xl font-semibold mb-2 text-gray-700">
                    Giỏ hàng của bạn đang trống
                </h2>
                <p className="text-gray-500 mb-6">
                    Hãy khám phá và thêm sản phẩm bạn yêu thích vào giỏ hàng nhé!
                </p>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/">Tiếp tục mua sắm</Link>
                </Button>
            </div>
        );
    }

    const subtotal = calculateSubtotal();

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl font-bold mb-8 text-center text-blue-800">
                    Giỏ hàng của bạn
                </h1>
                <div className="grid md:grid-cols-3 gap-8 items-start">
                    <div className="md:col-span-2 space-y-6">
                        {/* Checkbox chọn tất cả */}
                        <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm border">
                            <Checkbox
                                checked={isAllActive}
                                onCheckedChange={handleSelectAll}
                                className="h-5 w-5 border-2 border-blue-400 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-600 data-[state=checked]:border-blue-500 focus-visible:ring-blue-500"
                            />
                            <span className="font-medium text-gray-700">
                                Chọn tất cả ({cartItems.length} sản phẩm)
                            </span>
                        </div>

                        {Object.values(groupedItems).map((shopGroup) => (
                            <div key={shopGroup.shopId} className="space-y-4">
                                <div className="flex items-center gap-3 border-b pb-2 mb-4">
                                    <Checkbox
                                        checked={isShopFullyActive(shopGroup.items)}
                                        onCheckedChange={(checked) =>
                                            handleSelectShop(shopGroup.items, checked as boolean)
                                        }
                                        className="mr-2 h-5 w-5 border-2 border-blue-400 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-600 data-[state=checked]:border-blue-500 focus-visible:ring-blue-500"
                                    />
                                    <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                                        {shopGroup.shopLogo ? (
                                            <Image
                                                src={mediaService.getMediaUrl(shopGroup.shopLogo)}
                                                alt={`${shopGroup.shopName} logo`}
                                                width={32}
                                                height={32}
                                                objectFit="cover"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Store className="h-5 w-5 text-gray-400" />
                                        )}
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-700">
                                        Shop: {shopGroup.shopName}
                                    </h2>
                                </div>

                                {/* Shop Discount Code Input */}
                                <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Store className="h-4 w-4 text-orange-600" />
                                        <span className="text-sm font-medium text-orange-700">
                                            Mã giảm giá shop {shopGroup.shopName}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Nhập mã giảm giá của shop"
                                            value={shopDiscountCodes[shopGroup.shopId] || ''}
                                            onChange={(e) =>
                                                setShopDiscountCodes((prev) => ({
                                                    ...prev,
                                                    [shopGroup.shopId]: e.target.value
                                                }))
                                            }
                                            className="flex-1 text-sm"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="bg-orange-600 text-white hover:bg-orange-700 border-orange-600"
                                            onClick={handleApplyDiscounts}
                                        >
                                            Lưu mã
                                        </Button>
                                    </div>
                                    {shopDiscountCodes[shopGroup.shopId] && (
                                        <div className="mt-2 flex items-center justify-between p-2 bg-orange-100 rounded-md">
                                            <span className="text-xs text-orange-800 font-medium">
                                                Mã "{shopDiscountCodes[shopGroup.shopId]}" đã được
                                                lưu
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setShopDiscountCodes((prev) => {
                                                        const newCodes = { ...prev };
                                                        delete newCodes[shopGroup.shopId];
                                                        return newCodes;
                                                    })
                                                }
                                                className="text-orange-700 hover:text-orange-900 p-1 h-auto"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {checkoutData && checkoutData.metadata.shops_info.find(s => s.shop_id === shopGroup.shopId)?.discount && (
                                    <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-md flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Tag className="h-4 w-4 text-green-600" />
                                            <span className="text-sm font-semibold text-green-700">
                                                Đã áp dụng: {checkoutData.metadata.shops_info.find(s => s.shop_id === shopGroup.shopId)?.discount?.discount_name}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-green-600">
                                            -{checkoutData.metadata.shops_info.find(s => s.shop_id === shopGroup.shopId)?.total_discount_price.toLocaleString('vi-VN')}₫
                                        </span>
                                    </div>
                                )}

                                {shopGroup.items.map((item) => (
                                    <Card
                                        key={item.sku_id}
                                        className={`p-4 shadow-md rounded-lg hover:shadow-lg transition-all duration-200 ${
                                            activeItems.includes(item.sku_id)
                                                ? 'border-2 border-blue-400 shadow-blue-200 bg-gradient-to-r from-blue-50 to-purple-50'
                                                : 'border border-gray-200'
                                        }`}
                                    >
                                        <div className="flex flex-col sm:flex-row items-center gap-4">
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    checked={activeItems.includes(item.sku_id)}
                                                    onCheckedChange={(checked) =>
                                                        handleSelectItem(
                                                            item.sku_id,
                                                            checked as boolean
                                                        )
                                                    }
                                                    className="h-5 w-5 border-2 border-blue-400 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-600 data-[state=checked]:border-blue-500 focus-visible:ring-blue-500"
                                                />
                                                <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-md overflow-hidden flex-shrink-0">
                                                    <Image
                                                        src={mediaService.getMediaUrl(
                                                            item.product_thumb
                                                        )}
                                                        alt={item.product_name}
                                                        layout="fill"
                                                        objectFit="cover"
                                                        className="bg-gray-100"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-grow text-center sm:text-left">
                                                <Link
                                                    href={`/products/${item.spu_id}?sku=${item.sku_id}`}
                                                    className={`hover:text-blue-600 ${
                                                        activeItems.includes(item.sku_id)
                                                            ? 'text-blue-700'
                                                            : ''
                                                    }`}
                                                >
                                                    <h3
                                                        className={`text-base font-semibold ${
                                                            activeItems.includes(item.sku_id)
                                                                ? 'text-blue-800'
                                                                : 'text-gray-800'
                                                        }`}
                                                    >
                                                        {item.product_name}
                                                    </h3>
                                                </Link>
                                                <div className="mt-1">
                                                    {(() => {
                                                        const shopInfo = checkoutData?.metadata.shops_info.find(
                                                            (s) => s.shop_id === item.shop_id
                                                        );
                                                        const productInfo = shopInfo?.products_info.find(
                                                            (p) => p.id === item.sku_id
                                                        );
                                                        if (
                                                            productInfo &&
                                                            productInfo.price < productInfo.price_raw
                                                        ) {
                                                            return (
                                                                <div className="flex flex-col">
                                                                    <span className="line-through text-xs text-gray-400">
                                                                        {productInfo.price_raw.toLocaleString(
                                                                            'vi-VN'
                                                                        )}
                                                                        ₫
                                                                    </span>
                                                                    <span className="text-sm font-bold text-blue-600">
                                                                        {productInfo.price.toLocaleString(
                                                                            'vi-VN'
                                                                        )}
                                                                        ₫
                                                                    </span>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <p className="text-sm font-bold text-blue-600">
                                                                {item.sku_price.toLocaleString('vi-VN')}₫
                                                            </p>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 my-2 sm:my-0">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() =>
                                                        handleUpdateQuantity(
                                                            item.sku_id,
                                                            item.quantity - 1
                                                        )
                                                    }
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <MinusSquare className="h-5 w-5" />
                                                </Button>
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) =>
                                                        handleUpdateQuantity(
                                                            item.sku_id,
                                                            parseInt(e.target.value, 10) || 1
                                                        )
                                                    }
                                                    className="w-16 text-center h-9"
                                                    min="1"
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() =>
                                                        handleUpdateQuantity(
                                                            item.sku_id,
                                                            item.quantity + 1
                                                        )
                                                    }
                                                >
                                                    <PlusSquare className="h-5 w-5" />
                                                </Button>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-700"
                                                onClick={() => handleRemoveItem(item.sku_id)}
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ))}
                    </div>

                    <Card className="md:col-span-1 p-6 shadow-lg rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 sticky top-24">
                        <CardHeader className="p-0 mb-6">
                            <CardTitle className="text-xl font-semibold text-blue-700">
                                Tóm tắt đơn hàng
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 p-0">
                            <div className="flex justify-between text-sm text-gray-700">
                                <span>Tạm tính ({calculateTotalItems()} sản phẩm đã chọn)</span>
                                <span className={checkoutData ? "line-through text-gray-400" : "font-medium"}>
                                    {subtotal.toLocaleString('vi-VN')}₫
                                </span>
                            </div>

                            {checkoutData && (
                                <>
                                    <div className="flex justify-between text-sm text-gray-700">
                                        <span>Tổng tiền hàng</span>
                                        <span className="font-medium">
                                            {checkoutData.metadata.total_price_raw.toLocaleString('vi-VN')}₫
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-700">
                                        <span>Phí vận chuyển</span>
                                        <span className="font-medium">
                                            {checkoutData.metadata.total_fee_ship > 0 
                                                ? `+${checkoutData.metadata.total_fee_ship.toLocaleString('vi-VN')}₫`
                                                : 'Miễn phí'}
                                        </span>
                                    </div>
                                    {checkoutData.metadata.total_discount_price > 0 && (
                                        <div className="flex justify-between text-sm text-green-600 font-medium font-bold">
                                            <span>Giảm giá tổng cộng</span>
                                            <span>-{checkoutData.metadata.total_discount_price.toLocaleString('vi-VN')}₫</span>
                                        </div>
                                    )}
                                    {checkoutData.metadata.discount && (
                                        <div className="flex justify-between text-xs text-purple-600 italic">
                                            <span>Mã Admin: {checkoutData.metadata.discount.discount_code}</span>
                                            <span>-{checkoutData.metadata.total_discount_admin_price.toLocaleString('vi-VN')}₫</span>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="border-t pt-3">
                                <div className="flex justify-between text-lg font-bold text-blue-800">
                                    <span>Tổng cộng</span>
                                    <span>
                                        {checkoutData 
                                            ? checkoutData.metadata.total_checkout.toLocaleString('vi-VN') + '₫'
                                            : subtotal.toLocaleString('vi-VN') + '₫'
                                        }
                                    </span>
                                </div>
                                {!checkoutData && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        * Giảm giá và phí vận chuyển sẽ được tính khi áp dụng mã
                                    </p>
                                )}
                            </div>
                        </CardContent>

                        {/* Address selection */}
                        {activeItems.length > 0 && (
                            <div className="mt-4 p-3 bg-white rounded-lg border">
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-700">
                                        Địa chỉ giao hàng
                                    </span>
                                </div>
                                {isAddressLoading ? (
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                ) : addresses.length > 0 ? (
                                    <Select
                                        value={selectedAddressId}
                                        onValueChange={setSelectedAddressId}
                                    >
                                        <SelectTrigger className="w-full">
                                            {selectedAddressId ? (
                                                <div className="flex flex-col items-start w-full">
                                                    {(() => {
                                                        const selectedAddress = addresses.find(
                                                            (addr) => addr._id === selectedAddressId
                                                        );
                                                        if (!selectedAddress)
                                                            return (
                                                                <SelectValue placeholder="Chọn địa chỉ giao hàng" />
                                                            );
                                                        return (
                                                            <>
                                                                <span className="text-sm font-medium truncate w-full text-left">
                                                                    {selectedAddress.recipient_name}
                                                                </span>
                                                                <span className="text-xs text-gray-500 truncate w-full text-left">
                                                                    {
                                                                        selectedAddress.location
                                                                            .district.district_name
                                                                    }
                                                                    ,{' '}
                                                                    {
                                                                        selectedAddress.location
                                                                            .province.province_name
                                                                    }
                                                                </span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <SelectValue placeholder="Chọn địa chỉ giao hàng" />
                                            )}
                                        </SelectTrigger>
                                        <SelectContent className="max-w-[400px]">
                                            {addresses.map((address) => (
                                                <SelectItem key={address._id} value={address._id}>
                                                    <div className="flex flex-col w-full max-w-[350px]">
                                                        <span className="font-medium text-sm truncate">
                                                            {address.recipient_name} -{' '}
                                                            {address.recipient_phone}
                                                        </span>
                                                        <span className="text-xs text-gray-500 truncate">
                                                            {address.location.address}
                                                        </span>
                                                        <span className="text-xs text-gray-500 truncate">
                                                            {address.location.ward?.ward_name &&
                                                                `${address.location.ward.ward_name}, `}
                                                            {
                                                                address.location.district
                                                                    .district_name
                                                            }
                                                            ,{' '}
                                                            {
                                                                address.location.province
                                                                    .province_name
                                                            }
                                                        </span>
                                                        {address.is_default && (
                                                            <span className="text-xs text-blue-600 font-medium">
                                                                Mặc định
                                                            </span>
                                                        )}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="text-sm text-gray-500">
                                        <p>Bạn chưa có địa chỉ giao hàng nào.</p>
                                        <Button
                                            asChild
                                            variant="link"
                                            className="p-0 h-auto text-blue-600"
                                        >
                                            <Link href="/profile">Thêm địa chỉ mới</Link>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Admin discount code input (global discount) */}
                        {activeItems.length > 0 && (
                            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Crown className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm font-medium text-purple-700">
                                        Mã giảm giá toàn hệ thống (Admin)
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Nhập mã giảm giá admin"
                                        value={adminDiscountCode}
                                        onChange={(e) => setAdminDiscountCode(e.target.value)}
                                        className="flex-1 text-sm"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="bg-purple-600 text-white hover:bg-purple-700 border-purple-600"
                                        onClick={handleApplyDiscounts}
                                    >
                                        Lưu mã
                                    </Button>
                                </div>
                                {adminDiscountCode && (
                                    <div className="mt-2 flex items-center justify-between p-2 bg-purple-100 rounded-md">
                                        <span className="text-xs text-purple-800 font-medium">
                                            Mã "{adminDiscountCode}" đã được lưu
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setAdminDiscountCode('')}
                                            className="text-purple-700 hover:text-purple-900 p-1 h-auto"
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        <CardFooter className="mt-6 p-0">
                            <Button
                                onClick={handleCheckout}
                                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-base py-3 shadow-lg hover:shadow-blue-200 transition-all duration-200"
                                disabled={
                                    activeItems.length === 0 || !selectedAddressId || isCheckingOut
                                }
                            >
                                {isCheckingOut
                                    ? 'Đang tính toán...'
                                    : `Tính toán đơn hàng (${activeItems.length})`}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
