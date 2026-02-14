'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';

import productService, {
    ProductDetailResponse,
    ProductSku,
    ProductAttribute,
    ProductVariation,
    SpuSelect,
    SkuOther
} from '@/lib/services/api/productService';
import { Category } from '@/lib/services/api/categoryService';
import shopService, { Shop } from '@/lib/services/api/shopService';
import reviewService, { Review } from '@/lib/services/api/reviewService';
import ReviewDisplay from '@/components/review/ReviewDisplay';
import { mediaService } from '@/lib/services/api/mediaService';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/lib/store/store';
import { addItemToCart } from '@/lib/store/slices/cartSlice';

// Import all product detail components
import {
    ProductBreadcrumbs,
    ImageGallery,
    ImageModal,
    ProductHeader,
    ProductPricing,
    ProductVariants,
    ProductDescription,
    ProductActions,
    ShopInfo,
    ProductReviews,
    RelatedProducts,
    ProductNavigation
} from '@/components/product-detail';

// Rating breakdown interface (kept for compatibility with other components)
interface RatingBreakdown {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
    total: number;
    average: number;
}

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;
    const { toast } = useToast();
    const dispatch = useDispatch<AppDispatch>();

    const [product, setProduct] = useState<ProductDetailResponse | null>(null);
    const [shop, setShop] = useState<Shop | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingShop, setLoadingShop] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<ProductSku[]>([]);
    const [loadingRelated, setLoadingRelated] = useState(false);
    const [selectedVariations, setSelectedVariations] = useState<{ [key: string]: number }>({});
    const [currentSku, setCurrentSku] = useState<ProductDetailResponse | SkuOther | null>(null);

    // Review states
    const [latestReview, setLatestReview] = useState<Review | null>(null);
    const [loadingLatestReview, setLoadingLatestReview] = useState(false);

    // Image modal states
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Combine SKU and SPU images with current SKU images taking priority
    const allImages = [
        ...(currentSku?.sku_thumb ? [currentSku.sku_thumb] : []),
        ...(currentSku?.sku_images || []),
        ...(product?.spu_select?.product_thumb && !currentSku?.sku_thumb
            ? [product.spu_select.product_thumb]
            : []),
        ...(product?.spu_select?.product_images || [])
    ].filter((img, index, arr) => img && arr.indexOf(img) === index); // Remove duplicates

    // Calculate current stock
    const currentStock = currentSku?.sku_stock ?? product?.spu_select?.product_quantity ?? 0;

    // Get breadcrumb data
    const breadcrumbData = product
        ? {
              category: product.spu_select.product_category,
              productName: product.spu_select.product_name
          }
        : null;

    // ── Helpers ──────────────────────────────────────────────
    // Collect ALL SKUs (sku_others + current product SKU) into one list
    const allSkus = useMemo(() => {
        if (!product) return [];
        const skus = [...(product.sku_others || [])];
        if (product.sku_tier_idx) skus.push(product as any);
        return skus;
    }, [product]);

    // Get every option index that appears in at least one SKU for a variation
    const getAllAvailableOptions = (variationIndex: number): Set<number> => {
        const available = new Set<number>();
        allSkus.forEach((sku) => {
            if (sku.sku_tier_idx?.[variationIndex] !== undefined) {
                available.add(sku.sku_tier_idx[variationIndex]);
            }
        });
        return available;
    };

    /**
     * Determines if a specific option should be disabled.
     * Rule 1: If the option index doesn't exist in ANY SKU → always disabled.
     * Rule 2: If nothing is selected yet → all existing options are enabled.
     * Rule 3: If there are selections → only enable options that have at least
     *         one compatible SKU with the current selections on OTHER variations.
     */
    const isOptionDisabled = (variationIndex: number, optionIndex: number): boolean => {
        // Rule 1: option must exist in at least one SKU
        const existsInAnySku = allSkus.some(
            (sku) => sku.sku_tier_idx?.[variationIndex] === optionIndex
        );
        if (!existsInAnySku) return true;

        // Rule 2: nothing selected → everything available is enabled
        if (Object.keys(selectedVariations).length === 0) return false;

        // Rule 3: check compatibility with other selected values
        return !allSkus.some((sku) => {
            if (!sku.sku_tier_idx || sku.sku_tier_idx[variationIndex] !== optionIndex) return false;
            return Object.entries(selectedVariations).every(([varIdx, optIdx]) => {
                const vi = parseInt(varIdx);
                if (vi === variationIndex) return true; // skip self
                return sku.sku_tier_idx[vi] === optIdx;
            });
        });
    };

    const findMatchingSku = (selections: { [key: string]: number }) => {
        if (!product?.sku_others) return null;

        const allSkus = [...product.sku_others];

        // Add current SKU if it has sku_tier_idx
        if (product.sku_tier_idx) {
            allSkus.push(product as any);
        }

        return allSkus.find((sku) => {
            if (!sku.sku_tier_idx) return false;

            // Check if all selections match this SKU's tier_idx
            return Object.entries(selections).every(([varIdx, optIdx]) => {
                const variationIndex = parseInt(varIdx);
                return sku.sku_tier_idx[variationIndex] === optIdx;
            });
        });
    };

    const isSelectionComplete = (selections: { [key: string]: number }) => {
        if (!product?.spu_select?.product_variations) return false;
        return product.spu_select.product_variations.every(
            (_, index) => selections[index.toString()] !== undefined
        );
    };

    // Handle variation selection
    const handleVariationChange = (variationIndex: string, optionIndex: number) => {
        setSelectedVariations((prev) => {
            const next = { ...prev };

            // Toggle: click same option → deselect
            if (next[variationIndex] === optionIndex) {
                delete next[variationIndex];
                return next;
            }

            // Set new selection
            next[variationIndex] = optionIndex;

            // Invalidate other selections that are no longer compatible
            Object.keys(next).forEach((otherIdx) => {
                if (otherIdx === variationIndex) return;
                const otherOpt = next[otherIdx];
                const stillValid = allSkus.some((sku) => {
                    if (!sku.sku_tier_idx) return false;
                    return (
                        sku.sku_tier_idx[parseInt(variationIndex)] === optionIndex &&
                        sku.sku_tier_idx[parseInt(otherIdx)] === otherOpt
                    );
                });
                if (!stillValid) delete next[otherIdx];
            });

            return next;
        });
    };

    // Reset all selections
    const handleResetVariations = () => {
        setSelectedVariations({});
    };

    // Event handlers for user interactions
    const handleImageModalOpen = (index: number) => {
        setCurrentImageIndex(index);
        setIsImageModalOpen(true);
    };

    const handleImageModalClose = () => {
        setIsImageModalOpen(false);
    };

    const handleImageModalNext = () => {
        setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    };

    const handleImageModalPrev = () => {
        setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    };

    const handleAddToCart = async () => {
        if (!currentSku?._id) {
            toast({
                title: 'Lỗi',
                description: 'Vui lòng chọn phiên bản sản phẩm',
                variant: 'destructive'
            });
            return;
        }

        try {
            await dispatch(addItemToCart({ skuId: currentSku._id, quantity: 1 })).unwrap();
            toast({
                title: 'Thành công!',
                description: 'Sản phẩm đã được thêm vào giỏ hàng',
                variant: 'success'
            });
        } catch (error) {
            toast({
                title: 'Lỗi',
                description: 'Không thể thêm sản phẩm vào giỏ hàng',
                variant: 'destructive'
            });
        }
    };

    const handleBuyNow = () => {
        // TODO: Implement buy now functionality
        console.log('Buy now clicked', currentSku?._id);
    };

    // Function to fetch latest review for a SKU
    const fetchLatestReview = async (skuId: string) => {
        try {
            setLoadingLatestReview(true);
            const response = await reviewService.getLastReviewBySkuId(skuId);
            setLatestReview(response.metadata);
        } catch (error) {
            console.error('Error fetching latest review:', error);
            setLatestReview(null);
        } finally {
            setLoadingLatestReview(false);
        }
    };

    // Update current SKU when selections change
    useEffect(() => {
        if (!product) return;

        if (isSelectionComplete(selectedVariations)) {
            // Find matching SKU when selection is complete
            const matchingSku = findMatchingSku(selectedVariations);
            if (matchingSku) {
                setCurrentSku(matchingSku);
            }
        } else {
            // When selection is incomplete, show the first SKU or main product SKU
            if (product.sku_others && product.sku_others.length > 0) {
                setCurrentSku(product.sku_others[0]);
            } else {
                setCurrentSku(product);
            }
        }
    }, [selectedVariations, product]);

    // Fetch latest review when current SKU changes
    useEffect(() => {
        if (currentSku?._id) {
            fetchLatestReview(currentSku._id);
        }
    }, [currentSku]);

    useEffect(() => {
        if (productId) {
            const fetchProduct = async () => {
                setLoading(true);
                setError(null);
                setProduct(null);
                try {
                    // Fetch product using SKU ID only
                    const data = await productService.getSkuById(productId);
                    console.log('Product fetch result:', { data });
                    // The data should be the first item in metadata array
                    const productData = Array.isArray(data) ? data[0] : data;

                    // Debug: Log SKU information
                    console.log('Product loaded:', {
                        productId,
                        currentSku: productData,
                        allSkus: productData?.sku_others,
                        variations: productData?.spu_select?.product_variations
                    });

                    if (productData?.sku_others) {
                        console.log('All available SKU tier indices:');
                        productData.sku_others.forEach((sku: any, index: number) => {
                            console.log(`SKU ${index}:`, sku.sku_tier_idx, sku._id);
                        });
                    }

                    setProduct(productData);
                    setCurrentSku(productData);

                    // Start with no pre-selected variations so user picks from scratch
                    setSelectedVariations({});

                    // Fetch shop information
                    if (productData?.spu_select?.product_shop) {
                        setLoadingShop(true);
                        try {
                            const shopData = await shopService.getShopById(
                                productData.spu_select.product_shop
                            );
                            setShop(shopData);
                        } catch (shopError) {
                            console.error('Error fetching shop data:', shopError);
                        } finally {
                            setLoadingShop(false);
                        }
                    }

                    // Fetch related products
                    if (productData?.spu_select?.product_category) {
                        setLoadingRelated(true);
                        try {
                            const relatedData = await productService.getSkusByCategory(
                                productData.spu_select.product_category
                            );
                            // Filter out current product and get only SKUs
                            const filtered = (relatedData || [])
                                .filter((sku: ProductSku) => sku._id !== productId)
                                .slice(0, 4);
                            setRelatedProducts(filtered);
                        } catch (relatedError) {
                            console.error('Error fetching related products:', relatedError);
                        } finally {
                            setLoadingRelated(false);
                        }
                    }
                } catch (err) {
                    setError('Failed to load product details');
                    console.error('Error fetching product:', err);
                } finally {
                    setLoading(false);
                }
            };

            fetchProduct();
        }
    }, [productId]);

    if (loading) {
        return (
            <>
                <div className="container mx-auto px-4 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Image skeleton */}
                        <div className="space-y-4">
                            <Skeleton className="w-full aspect-square rounded-lg" />
                            <div className="flex gap-2">
                                {[...Array(4)].map((_, i) => (
                                    <Skeleton key={i} className="w-20 h-20 rounded-md" />
                                ))}
                            </div>
                        </div>

                        {/* Content skeleton */}
                        <div className="space-y-6">
                            <Skeleton className="h-8 w-3/4" />
                            <Skeleton className="h-6 w-1/2" />
                            <Skeleton className="h-10 w-1/3" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                            <div className="flex gap-4">
                                <Skeleton className="h-12 flex-1" />
                                <Skeleton className="h-12 flex-1" />
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (error || !product) {
        return (
            <>
                <div className="container mx-auto px-4 py-8">
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Không tìm thấy sản phẩm
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {error || 'Sản phẩm bạn đang tìm kiếm không tồn tại.'}
                        </p>
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                onClick={() => router.back()}
                                className="flex items-center gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Quay lại
                            </Button>
                            <Button asChild>
                                <Link href="/products">Xem sản phẩm</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="bg-gray-50 min-h-screen">
                <div className="container mx-auto px-4 py-6">
                    {/* Breadcrumbs */}
                    <ProductBreadcrumbs />

                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
                            {/* Image Gallery */}
                            <ImageGallery
                                images={allImages}
                                productName={product.spu_select.product_name}
                                onImageClick={handleImageModalOpen}
                            />

                            {/* Product Info */}
                            <div className="space-y-6">
                                {/* Product Header */}
                                <ProductHeader
                                    productName={product.spu_select.product_name}
                                    rating={0}
                                    soldCount={product.spu_select.product_sold || 0}
                                />

                                {/* Product Pricing */}
                                <ProductPricing
                                    price={currentSku?.sku_price || 0}
                                    stock={currentStock}
                                />

                                {/* Product Variants */}
                                {product.spu_select.product_variations &&
                                    product.spu_select.product_variations.length > 0 && (
                                        <ProductVariants
                                            variations={product.spu_select.product_variations}
                                            selectedVariations={selectedVariations}
                                            onVariationChange={handleVariationChange}
                                            onReset={handleResetVariations}
                                            isOptionDisabled={isOptionDisabled}
                                        />
                                    )}

                                {/* Product Actions */}
                                <ProductActions
                                    stock={currentStock}
                                    currentSkuId={currentSku?._id}
                                    onAddToCart={handleAddToCart}
                                    onBuyNow={handleBuyNow}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Shop Info */}
                        {shop && (
                            <div className="p-6">
                                <ShopInfo shop={shop} loading={loadingShop} />
                            </div>
                        )}

                        <Separator />

                        {/* Product Description */}
                        <div className="p-6">
                            <ProductDescription
                                description={product.spu_select.product_description}
                                attributes={product.spu_select.product_attributes}
                            />
                        </div>

                        <Separator />

                        {/* Latest Review for Current SKU */}
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Đánh giá gần nhất</h3>
                            {loadingLatestReview ? (
                                <div className="text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Đang tải đánh giá...
                                    </p>
                                </div>
                            ) : latestReview ? (
                                <ReviewDisplay review={latestReview} showProductInfo={false} />
                            ) : (
                                <div className="text-center py-8 bg-gray-50 rounded-lg">
                                    <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">
                                        Chưa có đánh giá nào cho sản phẩm này
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Hãy là người đầu tiên đánh giá sản phẩm này
                                    </p>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Product Reviews */}
                        <div className="p-6">
                            {currentSku?._id && <ProductReviews skuId={currentSku._id} />}
                        </div>
                    </div>

                    {/* Related Products */}
                    {relatedProducts.length > 0 && (
                        <div className="mt-8">
                            <RelatedProducts
                                relatedProducts={relatedProducts}
                                loading={loadingRelated}
                            />
                        </div>
                    )}

                    {/* Product Navigation */}
                    {product?.spu_select?.product_category && currentSku?._id && (
                        <ProductNavigation
                            currentProductId={currentSku._id}
                            categoryId={product.spu_select.product_category}
                        />
                    )}
                </div>
            </div>

            {/* Image Modal */}
            {isImageModalOpen && (
                <ImageModal
                    images={allImages}
                    currentIndex={currentImageIndex}
                    productName={product.spu_select.product_name}
                    isOpen={isImageModalOpen}
                    onClose={handleImageModalClose}
                    onNext={handleImageModalNext}
                    onPrevious={handleImageModalPrev}
                />
            )}
        </>
    );
}
