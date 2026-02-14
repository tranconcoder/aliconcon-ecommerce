import Link from 'next/link';
import Image from 'next/image';
import {
    Heart,
    ShoppingCart,
    ChevronRight,
    CheckCircle,
    AlertTriangle,
    Info,
    XCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { spuService, SPU } from '@/lib/services/api/spuService';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/lib/store/store';
import { addItemToCart } from '@/lib/store/slices/cartSlice';
import { mediaService } from '@/lib/services/api/mediaService';
import { useToast } from '@/hooks/use-toast';

export function PopulateProductsSection() {
    const [popularProducts, setPopularProducts] = useState<SPU[]>([]);
    const [isLoadingPopularProducts, setIsLoadingPopularProducts] = useState(true);
    const [errorPopularProducts, setErrorPopularProducts] = useState<string | null>(null);

    const dispatch = useDispatch<AppDispatch>();
    const { toast } = useToast();

    const handleAddToCart = async (skuId: string) => {
        try {
            await dispatch(addItemToCart({ skuId, quantity: 1 })).unwrap();
            toast({
                title: 'Thành công!',
                description: 'Sản phẩm đã được thêm vào giỏ hàng của bạn',
                variant: 'success'
            });
        } catch (error) {
            toast({
                title: 'Lỗi',
                description: 'Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.',
                variant: 'destructive'
            });
        }
    };

    useEffect(() => {
        const fetchPopularProducts = async () => {
            try {
                setIsLoadingPopularProducts(true);
                const fetchedProducts = await spuService.getPopularProducts();
                setPopularProducts(fetchedProducts);
                setErrorPopularProducts(null);

                // Show info toast when products are loaded
                if (fetchedProducts.length > 0) {
                    toast({
                        title: 'Thông tin',
                        description: `Đã tải ${fetchedProducts.length} sản phẩm phổ biến`,
                        variant: 'success'
                    });
                }
            } catch (error) {
                console.error('Failed to fetch popular products:', error);
                setErrorPopularProducts('Không thể tải sản phẩm phổ biến. Vui lòng thử lại sau.');

                // Show warning toast on error
                toast({
                    title: 'Cảnh báo',
                    description: 'Không thể tải sản phẩm phổ biến. Vui lòng thử lại sau.',
                    variant: 'destructive'
                });
            }
            setIsLoadingPopularProducts(false);
        };

        fetchPopularProducts();
    }, [toast]);

    return (
        <section className="py-16 bg-gradient-to-b from-white to-blue-50">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold">Sản phẩm phổ biến</h2>
                    <Button variant="ghost" className="text-blue-600 gap-1">
                        Xem tất cả <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {isLoadingPopularProducts &&
                        Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="group animate-pulse">
                                <Skeleton className="relative aspect-square rounded-xl overflow-hidden bg-gray-200 mb-3 h-[200px] w-full" />
                                <Skeleton className="h-5 w-3/4 mt-1" />
                                <Skeleton className="h-4 w-1/2 mt-1" />
                            </div>
                        ))}
                    {!isLoadingPopularProducts && errorPopularProducts && (
                        <div className="col-span-full text-center text-red-500">
                            <p>{errorPopularProducts}</p>
                        </div>
                    )}
                    {!isLoadingPopularProducts &&
                        !errorPopularProducts &&
                        popularProducts.map((product) => (
                            <div key={product._id} className="group">
                                <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 mb-3">
                                    <Image
                                        src={
                                            mediaService.getMediaUrl(product.product_thumb) ||
                                            '/placeholder.svg'
                                        }
                                        alt={product.product_name}
                                        fill
                                        className="object-cover transition-transform group-hover:scale-105"
                                    />
                                    <Button
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white"
                                    >
                                        <Heart className="h-4 w-4" />
                                        <span className="sr-only">
                                            Thêm vào danh sách yêu thích
                                        </span>
                                    </Button>
                                </div>
                                <div>
                                    <Link
                                        href={`/products/${product.sku?._id}`}
                                        className="hover:text-blue-600"
                                    >
                                        <h3 className="font-medium text-sm group-hover:text-blue-600 transition-colors truncate">
                                            {product.product_name}
                                        </h3>
                                    </Link>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center">
                                        <span>Đã bán: {product.product_sold}</span>
                                        <span className="mx-1">|</span>
                                        <span>
                                            Đánh giá: {product.product_rating_avg.toFixed(1)} ⭐
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="font-semibold">
                                            {/* Assuming sku.sku_price is available and is a number. Adjust formatting as needed. */}
                                            {product.sku?.sku_price
                                                ? `${product.sku.sku_price.toLocaleString(
                                                      'vi-VN'
                                                  )}₫`
                                                : 'N/A'}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0"
                                            onClick={() => {
                                                if (product.sku?._id) {
                                                    handleAddToCart(product.sku._id);
                                                } else {
                                                    console.error(
                                                        'Product SKU ID is not available.'
                                                    );
                                                    toast({
                                                        title: 'Cảnh báo',
                                                        description:
                                                            'Sản phẩm này hiện không có sẵn.',
                                                        variant: 'destructive'
                                                    });
                                                }
                                            }}
                                        >
                                            <ShoppingCart className="h-4 w-4" />
                                            <span className="sr-only">Thêm vào giỏ hàng</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    {!isLoadingPopularProducts &&
                        !errorPopularProducts &&
                        popularProducts.length === 0 && (
                            <div className="col-span-full text-center text-gray-500">
                                <p>Không tìm thấy sản phẩm phổ biến nào.</p>
                            </div>
                        )}
                </div>
            </div>
        </section>
    );
}
