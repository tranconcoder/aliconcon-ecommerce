import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './DiscountDetail.module.scss';
import axiosClient from '../../configs/axios';
import { API_URL } from '../../configs/env.config';
import { useToast } from '../../contexts/ToastContext';
import { formatDateTime, formatCurrency } from '../../utils/format';

const cx = classNames.bind(styles);

function DiscountDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [discount, setDiscount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchDiscountDetail = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get(`${API_URL}/discount/edit/${id}`);
            console.log('Discount detail response:', response.data); // Debug log
            if (response.data && response.data.metadata) {
                setDiscount(response.data.metadata);
            } else if (response.data && response.data.data) {
                setDiscount(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching discount detail:', error);
            showToast('Không thể tải thông tin mã giảm giá', 'error');
            navigate('/discounts');
        } finally {
            setLoading(false);
        }
    }, [id, showToast, navigate]);

    useEffect(() => {
        fetchDiscountDetail();
    }, [fetchDiscountDetail]);

    const handleTogglePublish = async () => {
        try {
            setActionLoading(true);
            const response = await axiosClient.patch(`${API_URL}/discount/${id}/toggle-publish`, {
                is_publish: !discount.is_publish
            });

            if (response.data && response.data.statusCode === 200) {
                setDiscount((prev) => ({ ...prev, is_publish: !prev.is_publish }));
                showToast(
                    `Mã giảm giá đã ${!discount.is_publish ? 'xuất bản' : 'ẩn'} thành công`,
                    'success'
                );
            }
        } catch (error) {
            console.error('Error toggling publish status:', error);
            showToast('Không thể cập nhật trạng thái xuất bản', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleAvailable = async () => {
        try {
            setActionLoading(true);
            const response = await axiosClient.patch(`${API_URL}/discount/${id}/toggle-available`, {
                is_available: !discount.is_available
            });

            if (response.data && response.data.statusCode === 200) {
                setDiscount((prev) => ({ ...prev, is_available: !prev.is_available }));
                showToast(
                    `Mã giảm giá đã ${
                        !discount.is_available ? 'kích hoạt' : 'vô hiệu hóa'
                    } thành công`,
                    'success'
                );
            }
        } catch (error) {
            console.error('Error toggling available status:', error);
            showToast('Không thể cập nhật trạng thái kích hoạt', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa mã giảm giá này?')) {
            return;
        }

        try {
            setActionLoading(true);
            const response = await axiosClient.delete(`${API_URL}/discount/${id}`);

            if (response.data && response.data.statusCode === 200) {
                showToast('Mã giảm giá đã được xóa thành công', 'success');
                navigate('/discounts');
            }
        } catch (error) {
            console.error('Error deleting discount:', error);
            showToast('Không thể xóa mã giảm giá', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status, type) => {
        const statusConfig = {
            publish: {
                true: { text: 'Đã xuất bản', class: 'published' },
                false: { text: 'Nháp', class: 'draft' }
            },
            available: {
                true: { text: 'Kích hoạt', class: 'active' },
                false: { text: 'Vô hiệu hóa', class: 'inactive' }
            }
        };

        const config = statusConfig[type][status];
        return <span className={cx('status-badge', config.class)}>{config.text}</span>;
    };

    if (loading) {
        return (
            <div className={cx('discount-detail')}>
                <div className={cx('loading')}>Đang tải thông tin mã giảm giá...</div>
            </div>
        );
    }

    if (!discount) {
        return (
            <div className={cx('discount-detail')}>
                <div className={cx('error')}>Không tìm thấy mã giảm giá</div>
            </div>
        );
    }

    return (
        <div className={cx('discount-detail')}>
            <div className={cx('header')}>
                <div className={cx('header-left')}>
                    <button className={cx('back-btn')} onClick={() => navigate('/discounts')}>
                        ← Quay lại
                    </button>
                    <div className={cx('title-section')}>
                        <h1>{discount.discount_name}</h1>
                        <div className={cx('status-badges')}>
                            {getStatusBadge(discount.is_publish, 'publish')}
                            {getStatusBadge(discount.is_available, 'available')}
                            {discount.is_admin_voucher && (
                                <span className={cx('status-badge', 'admin')}>Admin Voucher</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className={cx('header-actions')}>
                    <button
                        className={cx('action-btn', 'edit-btn')}
                        onClick={() => navigate(`/discounts/edit/${id}`)}
                        disabled={actionLoading}
                    >
                        Chỉnh sửa
                    </button>
                    <button
                        className={cx('action-btn', 'toggle-btn')}
                        onClick={handleTogglePublish}
                        disabled={actionLoading}
                    >
                        {discount.is_publish ? 'Ẩn' : 'Xuất bản'}
                    </button>
                    <button
                        className={cx('action-btn', 'toggle-btn')}
                        onClick={handleToggleAvailable}
                        disabled={actionLoading}
                    >
                        {discount.is_available ? 'Vô hiệu hóa' : 'Kích hoạt'}
                    </button>
                    <button
                        className={cx('action-btn', 'delete-btn')}
                        onClick={handleDelete}
                        disabled={actionLoading}
                    >
                        Xóa
                    </button>
                </div>
            </div>

            <div className={cx('content')}>
                <div className={cx('info-section')}>
                    <h2>Thông tin cơ bản</h2>
                    <div className={cx('info-grid')}>
                        <div className={cx('info-item')}>
                            <label>Mã giảm giá:</label>
                            <span className={cx('discount-code')}>{discount.discount_code}</span>
                        </div>
                        <div className={cx('info-item')}>
                            <label>Loại giảm giá:</label>
                            <span>
                                {discount.discount_type === 'percentage'
                                    ? 'Theo phần trăm'
                                    : 'Số tiền cố định'}
                            </span>
                        </div>
                        <div className={cx('info-item')}>
                            <label>Giá trị giảm:</label>
                            <span className={cx('discount-value')}>
                                {discount.discount_type === 'percentage'
                                    ? `${discount.discount_value}%`
                                    : formatCurrency(discount.discount_value)}
                            </span>
                        </div>
                        {discount.discount_max_value && (
                            <div className={cx('info-item')}>
                                <label>Giá trị giảm tối đa:</label>
                                <span>{formatCurrency(discount.discount_max_value)}</span>
                            </div>
                        )}
                        <div className={cx('info-item')}>
                            <label>Đơn hàng tối thiểu:</label>
                            <span>{formatCurrency(discount.discount_min_order_cost || 0)}</span>
                        </div>
                        <div className={cx('info-item')}>
                            <label>Áp dụng cho:</label>
                            <span>
                                {discount.is_apply_all_product
                                    ? 'Tất cả sản phẩm'
                                    : 'Sản phẩm được chọn'}
                            </span>
                        </div>
                    </div>

                    {discount.discount_description && (
                        <div className={cx('description')}>
                            <label>Mô tả:</label>
                            <p>{discount.discount_description}</p>
                        </div>
                    )}
                </div>

                <div className={cx('usage-section')}>
                    <h2>Thông tin sử dụng</h2>
                    <div className={cx('usage-grid')}>
                        <div className={cx('usage-item')}>
                            <label>Đã sử dụng:</label>
                            <span className={cx('usage-count')}>
                                {discount.discount_used_count || 0}
                            </span>
                        </div>
                        {discount.discount_count && (
                            <div className={cx('usage-item')}>
                                <label>Tổng số lượng:</label>
                                <span>{discount.discount_count}</span>
                            </div>
                        )}
                        <div className={cx('usage-item')}>
                            <label>Giới hạn mỗi người:</label>
                            <span>{discount.discount_user_max_use || 'Không giới hạn'}</span>
                        </div>
                    </div>
                </div>

                <div className={cx('time-section')}>
                    <h2>Thời gian áp dụng</h2>
                    <div className={cx('time-grid')}>
                        <div className={cx('time-item')}>
                            <label>Bắt đầu:</label>
                            <span>{formatDateTime(discount.discount_start_at)}</span>
                        </div>
                        <div className={cx('time-item')}>
                            <label>Kết thúc:</label>
                            <span>{formatDateTime(discount.discount_end_at)}</span>
                        </div>
                        <div className={cx('time-item')}>
                            <label>Tạo lúc:</label>
                            <span>{formatDateTime(discount.created_at)}</span>
                        </div>
                        <div className={cx('time-item')}>
                            <label>Cập nhật lúc:</label>
                            <span>{formatDateTime(discount.updated_at)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DiscountDetail;
