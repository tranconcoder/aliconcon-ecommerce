import React, { useState, useEffect, useCallback } from 'react';
import classNames from 'classnames/bind';
import styles from './ReviewManager.module.scss';
import axiosClient from '../../configs/axios';
import { useToast } from '../../contexts/ToastContext';
import { formatDateTime } from '../../utils/format';
import { getMediaUrl } from '../../utils/media';
import { FaStar, FaAngleLeft, FaAngleRight } from 'react-icons/fa';

const cx = classNames.bind(styles);

function ReviewManager() {
    const { showToast } = useToast();
    const [reviews, setReviews] = useState([]);
    const [statistics, setStatistics] = useState({
        totalReviews: 0,
        averageRating: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    });
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalReviews: 0,
        limit: 10
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter states
    const [filters, setFilters] = useState({
        rating: '',
        sortBy: 'createdAt',
        sortType: 'desc',
        page: 1,
        limit: 10
    });

    // Modal state for image preview
    const [previewImage, setPreviewImage] = useState(null);

    const fetchReviews = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = {
                page: filters.page,
                limit: filters.limit,
                sortBy: filters.sortBy,
                sortType: filters.sortType
            };

            if (filters.rating) {
                params.rating = filters.rating;
            }

            const response = await axiosClient.get('/review/shop/own', { params });

            if (response.data && response.data.metadata) {
                const { reviews, pagination, statistics } = response.data.metadata;
                setReviews(reviews || []);
                setPagination(pagination || {});
                setStatistics(
                    statistics || {
                        totalReviews: 0,
                        averageRating: 0,
                        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                    }
                );
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
            setError('Không thể tải danh sách đánh giá. Vui lòng thử lại sau.');
            showToast('Lỗi khi tải danh sách đánh giá', 'error');
        } finally {
            setLoading(false);
        }
    }, [filters, showToast]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
            page: field === 'page' ? value : 1 // Reset to page 1 when changing filters
        }));
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            handleFilterChange('page', newPage);
        }
    };

    const renderStars = (rating, maxRating = 5) => {
        const stars = [];
        for (let i = 1; i <= maxRating; i++) {
            stars.push(<FaStar key={i} className={cx('star', { empty: i > rating })} />);
        }
        return stars;
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const openImagePreview = (imageUrl) => {
        setPreviewImage(imageUrl);
    };

    const closeImagePreview = () => {
        setPreviewImage(null);
    };

    const renderRatingBreakdown = () => {
        const totalReviews = statistics.totalReviews || 0;

        return (
            <div className={cx('rating-breakdown')}>
                {[5, 4, 3, 2, 1].map((rating) => {
                    const count = statistics.ratingBreakdown[rating] || 0;
                    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

                    return (
                        <div key={rating} className={cx('breakdown-item')}>
                            <span className={cx('rating-label')}>{rating} sao</span>
                            <div className={cx('progress-bar')}>
                                <div
                                    className={cx('progress-fill')}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <span className={cx('count')}>{count}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className={cx('review-manager-container')}>
            {/* Header */}
            <div className={cx('header')}>
                <h1>Quản Lý Đánh Giá</h1>
                <div className={cx('header-stats')}>
                    <div className={cx('stat-item')}>
                        <span className={cx('stat-number')}>{statistics.totalReviews}</span>
                        <span className={cx('stat-label')}>Tổng đánh giá</span>
                    </div>
                    <div className={cx('stat-item')}>
                        <span className={cx('stat-number')}>{statistics.averageRating}</span>
                        <span className={cx('stat-label')}>Điểm trung bình</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className={cx('filters-container')}>
                <div className={cx('filters-row')}>
                    <div className={cx('filter-group')}>
                        <label>Lọc theo đánh giá</label>
                        <select
                            value={filters.rating}
                            onChange={(e) => handleFilterChange('rating', e.target.value)}
                        >
                            <option value="">Tất cả</option>
                            <option value="5">5 sao</option>
                            <option value="4">4 sao</option>
                            <option value="3">3 sao</option>
                            <option value="2">2 sao</option>
                            <option value="1">1 sao</option>
                        </select>
                    </div>

                    <div className={cx('filter-group')}>
                        <label>Sắp xếp theo</label>
                        <select
                            value={filters.sortBy}
                            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                        >
                            <option value="createdAt">Thời gian</option>
                            <option value="review_rating">Đánh giá</option>
                        </select>
                    </div>

                    <div className={cx('filter-group')}>
                        <label>Thứ tự</label>
                        <select
                            value={filters.sortType}
                            onChange={(e) => handleFilterChange('sortType', e.target.value)}
                        >
                            <option value="desc">Giảm dần</option>
                            <option value="asc">Tăng dần</option>
                        </select>
                    </div>

                    <div className={cx('items-per-page')}>
                        <span>Hiển thị:</span>
                        <select
                            value={filters.limit}
                            onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                        <span>mục mỗi trang</span>
                    </div>
                </div>
            </div>

            {/* Statistics */}
            {!loading && statistics.totalReviews > 0 && (
                <div className={cx('statistics-container')}>
                    <h2 className={cx('stats-title')}>Thống kê đánh giá</h2>
                    <div className={cx('overall-rating')}>
                        <span className={cx('rating-number')}>{statistics.averageRating}</span>
                        <div className={cx('rating-stars')}>
                            {renderStars(Math.round(statistics.averageRating))}
                        </div>
                        <span className={cx('total-reviews')}>
                            ({statistics.totalReviews} đánh giá)
                        </span>
                    </div>
                    {renderRatingBreakdown()}
                </div>
            )}

            {/* Content */}
            <div className={cx('content-container')}>
                {loading ? (
                    <div className={cx('loading-state')}>
                        <div className={cx('loader')}></div>
                        <p>Đang tải đánh giá...</p>
                    </div>
                ) : error ? (
                    <div className={cx('error-state')}>
                        <p>{error}</p>
                        <button className={cx('retry-button')} onClick={fetchReviews}>
                            Thử lại
                        </button>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className={cx('empty-state')}>
                        <div className={cx('empty-icon')}>⭐</div>
                        <p>Chưa có đánh giá nào cho shop của bạn.</p>
                    </div>
                ) : (
                    <div className={cx('reviews-list')}>
                        {reviews.map((review) => (
                            <div key={review._id} className={cx('review-item')}>
                                <div className={cx('review-header')}>
                                    <div className={cx('user-info')}>
                                        <div className={cx('user-avatar')}>
                                            {review.user_id?.user_avatar ? (
                                                <img
                                                    src={getMediaUrl(review.user_id.user_avatar)}
                                                    alt="Avatar"
                                                />
                                            ) : (
                                                getInitials(review.user_id?.user_fullName)
                                            )}
                                        </div>
                                        <div className={cx('user-details')}>
                                            <div className={cx('user-name')}>
                                                {review.user_id?.user_fullName ||
                                                    'Người dùng ẩn danh'}
                                            </div>
                                            <div className={cx('review-date')}>
                                                {formatDateTime(review.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={cx('rating-stars')}>
                                        {renderStars(review.review_rating)}
                                    </div>
                                </div>

                                <div className={cx('product-info')}>
                                    <img
                                        src={getMediaUrl(review.sku_id?.sku_thumb)}
                                        alt="Product"
                                        className={cx('product-thumb')}
                                    />
                                    <div className={cx('product-details')}>
                                        <div className={cx('product-name')}>
                                            {review.sku_id?.sku_product?.product_name || 'Sản phẩm'}
                                        </div>
                                        <div className={cx('sku-name')}>
                                            {review.sku_id?.sku_name || 'Phiên bản'}
                                        </div>
                                    </div>
                                </div>

                                <div className={cx('review-content')}>
                                    {review.review_content && (
                                        <div className={cx('review-text')}>
                                            {review.review_content}
                                        </div>
                                    )}

                                    {review.review_images && review.review_images.length > 0 && (
                                        <div className={cx('review-images')}>
                                            {review.review_images.map((image, index) => (
                                                <img
                                                    key={index}
                                                    src={getMediaUrl(image)}
                                                    alt={`Review ${index + 1}`}
                                                    className={cx('review-image')}
                                                    onClick={() =>
                                                        openImagePreview(getMediaUrl(image))
                                                    }
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {!loading && !error && reviews.length > 0 && pagination.totalPages > 1 && (
                <div className={cx('pagination-container')}>
                    <button
                        className={cx('page-btn', 'prev-btn', {
                            disabled: pagination.currentPage === 1
                        })}
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                    >
                        <FaAngleLeft />
                        <span>Trước</span>
                    </button>

                    <div className={cx('page-numbers')}>
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            let pageNum;
                            if (pagination.totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (pagination.currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (pagination.currentPage >= pagination.totalPages - 2) {
                                pageNum = pagination.totalPages - 4 + i;
                            } else {
                                pageNum = pagination.currentPage - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    className={cx('page-number', {
                                        active: pageNum === pagination.currentPage
                                    })}
                                    onClick={() => handlePageChange(pageNum)}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        className={cx('page-btn', 'next-btn', {
                            disabled: pagination.currentPage === pagination.totalPages
                        })}
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                    >
                        <span>Tiếp</span>
                        <FaAngleRight />
                    </button>
                </div>
            )}

            {/* Image Preview Modal */}
            {previewImage && (
                <div className={cx('image-preview-modal')} onClick={closeImagePreview}>
                    <div className={cx('modal-backdrop')} />
                    <div className={cx('modal-content')} onClick={(e) => e.stopPropagation()}>
                        <button className={cx('close-button')} onClick={closeImagePreview}>
                            ×
                        </button>
                        <img src={previewImage} alt="Preview" className={cx('preview-image')} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReviewManager;
