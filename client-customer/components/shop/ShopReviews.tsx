'use client';

import { useEffect, useState } from 'react';
import { Star, User, Image as ImageIcon, ThumbsUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

import reviewService, { Review, ReviewStatistics } from '@/lib/services/api/reviewService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomImage } from '@/components/ui/CustomImage';
import { mediaService } from '@/lib/services/api/mediaService';
import { cn } from '@/lib/utils';

interface ShopReviewsProps {
    shopId: string;
}

const ShopReviews = ({ shopId }: ShopReviewsProps) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [statistics, setStatistics] = useState<ReviewStatistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedRating, setSelectedRating] = useState<number | undefined>(undefined);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const response = await reviewService.getReviewsByShopId(shopId, {
                page,
                limit: 5,
                rating: selectedRating
            });
            setReviews(response.metadata.reviews);
            setStatistics(response.metadata.statistics);
            setTotalPages(response.metadata.pagination.totalPages);
        } catch (err) {
            console.error('Failed to fetch shop reviews:', err);
            setError('Could not load reviews.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (shopId) {
            fetchReviews();
        }
    }, [shopId, page, selectedRating]);

    const handleRatingFilter = (rating: number | undefined) => {
        if (selectedRating === rating) {
            setSelectedRating(undefined); // Toggle off
        } else {
            setSelectedRating(rating);
        }
        setPage(1); // Reset to first page
    };

    if (loading && !statistics) {
        return <ShopReviewsSkeleton />;
    }

    if (error) {
        return (
            <div className="text-center py-8 text-red-500">
                <p>{error}</p>
                <Button variant="outline" onClick={fetchReviews} className="mt-4">
                    Thử lại
                </Button>
            </div>
        );
    }

    if (!statistics || statistics.totalReviews === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <div className="mb-4 bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <Star className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">Chưa có đánh giá nào</h3>
                <p className="text-slate-500 mt-1">Shop này chưa nhận được đánh giá nào từ khách hàng.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header & Statistics */}
            <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                    <Star className="w-6 h-6 text-yellow-500 mr-2 fill-yellow-500" />
                    Đánh giá từ khách hàng
                    <span className="ml-3 text-lg font-normal text-slate-500">
                        ({statistics.totalReviews} đánh giá)
                    </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Overall Rating */}
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-5xl font-bold text-slate-800 mb-2">
                            {statistics.averageRating.toFixed(1)}
                        </div>
                        <div className="flex mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={cn(
                                        "w-6 h-6",
                                        star <= Math.round(statistics.averageRating)
                                            ? "text-yellow-400 fill-yellow-400"
                                            : "text-slate-300"
                                    )}
                                />
                            ))}
                        </div>
                        <p className="text-slate-500 text-sm">Điểm đánh giá trung bình</p>
                    </div>

                    {/* Rating Breakdown */}
                    <div className="md:col-span-2 space-y-3">
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = statistics.ratingBreakdown[star as keyof typeof statistics.ratingBreakdown] || 0;
                            const percentage = (count / statistics.totalReviews) * 100;
                            
                            return (
                                <div key={star} className="flex items-center gap-4 cursor-pointer group" onClick={() => handleRatingFilter(star)}>
                                    <div className="flex items-center w-12 flex-shrink-0">
                                        <span className={cn("font-medium mr-1", selectedRating === star ? "text-blue-600" : "text-slate-600")}>{star}</span>
                                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    </div>
                                    <div className="flex-grow h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={cn("h-full rounded-full transition-all duration-500", selectedRating === star ? "bg-blue-500" : "bg-yellow-400")}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="w-12 text-right text-sm text-slate-500 flex-shrink-0 group-hover:text-blue-600 transition-colors">
                                        {count}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Filter Tags */}
                <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-slate-100">
                    <Button
                        variant={selectedRating === undefined ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleRatingFilter(undefined)}
                        className="rounded-full"
                    >
                        Tất cả
                    </Button>
                    {[5, 4, 3, 2, 1].map((star) => (
                        <Button
                            key={star}
                            variant={selectedRating === star ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleRatingFilter(star)}
                            className={cn("rounded-full", selectedRating === star && "bg-yellow-500 hover:bg-yellow-600 border-yellow-500")}
                        >
                            {star} sao
                        </Button>
                    ))}
                </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
                {reviews.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-dashed border-slate-300">
                        <p className="text-slate-500">Không có đánh giá nào {selectedRating ? `cho ${selectedRating} sao` : ''}</p>
                        {selectedRating && (
                            <Button variant="link" onClick={() => handleRatingFilter(undefined)}>
                                Xem tất cả đánh giá
                            </Button>
                        )}
                    </div>
                ) : (
                    reviews.map((review) => (
                        <ReviewCard key={review._id} review={review} />
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center pt-4">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                            Trước
                        </Button>
                        <div className="flex items-center px-4 text-sm font-medium text-slate-600">
                            Trang {page} / {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        >
                            Sau
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ReviewCard = ({ review }: { review: Review }) => {
    // Type guard/check for user_id which might be populated or just a string
    const user = typeof review.user_id === 'object' ? review.user_id : { user_fullName: 'Người dùng', user_avatar: undefined };
    const sku = (review as any).sku_id; // Cast to any to access populated fields if they exist in response but not in interface yet

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-slate-100">
                        <AvatarImage src={mediaService.getMediaUrl(user.user_avatar || '')} />
                        <AvatarFallback className="bg-slate-100 text-slate-500">
                            <User className="w-5 h-5" />
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-medium text-slate-900">{user.user_fullName}</div>
                        <div className="flex items-center text-xs text-slate-500 mt-0.5">
                            <Calendar className="w-3 h-3 mr-1" />
                            {format(new Date(review.createdAt), 'dd/MM/yyyy', { locale: vi })}
                        </div>
                    </div>
                </div>
                <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={cn(
                                "w-4 h-4",
                                star <= review.review_rating
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-slate-200"
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* Product Info (if available) */}
            {sku && sku.sku_product && (
                <div className="mb-3 px-3 py-2 bg-slate-50 rounded-lg text-sm flex items-center gap-3 text-slate-600 border border-slate-100">
                    {sku.sku_thumb && (
                        <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-slate-200">
                             <CustomImage
                                src={mediaService.getMediaUrl(sku.sku_thumb)}
                                alt={sku.sku_product.product_name}
                                fill
                                className="object-cover"
                            />
                        </div>
                    )}
                    <span className="truncate line-clamp-1 flex-1">
                        Sản phẩm: <span className="font-medium text-slate-800">{sku.sku_product.product_name}</span>
                        {sku.sku_name && <span className="text-slate-500"> ({sku.sku_name})</span>}
                    </span>
                </div>
            )}

            <div className="text-slate-700 leading-relaxed mb-4">
                {review.review_content}
            </div>

            {review.review_images && review.review_images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {review.review_images.map((img, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 cursor-zoom-in group">
                            <CustomImage
                                src={mediaService.getMediaUrl(img)}
                                alt="Review image"
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ShopReviewsSkeleton = () => {
    return (
        <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm p-8">
                <Skeleton className="h-8 w-64 mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="h-40 bg-slate-50 rounded-xl flex items-center justify-center">
                        <Skeleton className="h-16 w-16 rounded-full" />
                    </div>
                    <div className="md:col-span-2 space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-6 w-full" />
                        ))}
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ShopReviews;
