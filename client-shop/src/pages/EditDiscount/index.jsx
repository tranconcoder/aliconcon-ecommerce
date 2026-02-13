import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from '../DiscountManager/DiscountManager.module.scss';
import axiosClient from '../../configs/axios';
import { API_URL } from '../../configs/env.config';
import ProductSelection from '../DiscountManager/components/ProductSelection';
import { useToast } from '../../contexts/ToastContext';
import { convertDatetimeLocalToISO, convertISOToDatetimeLocal } from '../../utils/datetime';

const cx = classNames.bind(styles);

function EditDiscount() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [errors, setErrors] = useState({});
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        discount_name: '',
        discount_description: '',
        discount_code: '',
        discount_type: 'percentage',
        discount_value: '',
        discount_count: '',
        discount_max_value: '',
        discount_user_max_use: '',
        discount_min_order_cost: '',
        discount_start_at: '',
        discount_end_at: '',
        discount_spus: [],
        is_publish: true,
        is_apply_all_product: true,
        is_available: true
    });

    const fetchDiscountData = useCallback(async () => {
        try {
            setInitialLoading(true);
            const response = await axiosClient.get(`${API_URL}/discount/edit/${id}`);
            if (response.data && response.data.data) {
                const discount = response.data.data;
                setFormData({
                    discount_name: discount.discount_name || '',
                    discount_description: discount.discount_description || '',
                    discount_code: discount.discount_code || '',
                    discount_type: discount.discount_type || 'percentage',
                    discount_value: discount.discount_value?.toString() || '',
                    discount_count: discount.discount_count?.toString() || '',
                    discount_max_value: discount.discount_max_value?.toString() || '',
                    discount_user_max_use: discount.discount_user_max_use?.toString() || '',
                    discount_min_order_cost: discount.discount_min_order_cost?.toString() || '',
                    discount_start_at: convertISOToDatetimeLocal(discount.discount_start_at) || '',
                    discount_end_at: convertISOToDatetimeLocal(discount.discount_end_at) || '',
                    discount_spus: discount.discount_skus || [], // Note: field name is discount_skus but contains SPU IDs
                    is_publish: discount.is_publish ?? true,
                    is_apply_all_product: discount.is_apply_all_product ?? true,
                    is_available: discount.is_available ?? true
                });
            }
        } catch (error) {
            console.error('Error fetching discount data:', error);
            showToast('Không thể tải thông tin mã giảm giá', 'error');
            navigate('/discounts');
        } finally {
            setInitialLoading(false);
        }
    }, [id, showToast, navigate]);

    useEffect(() => {
        fetchDiscountData();
    }, [fetchDiscountData]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
            // Nếu chọn áp dụng tất cả sản phẩm, reset danh sách SPUs đã chọn
            ...(name === 'is_apply_all_product' && checked ? { discount_spus: [] } : {}),
            // Nếu chuyển sang percentage và chưa có giá trị hoặc giá trị = 0, đặt mặc định là 1
            ...(name === 'discount_type' &&
            value === 'percentage' &&
            (!prev.discount_value || prev.discount_value === '' || prev.discount_value === '0')
                ? { discount_value: '1' }
                : {})
        }));
    };

    const handleSelectedSpusChange = (selectedSpus, applyAll) => {
        setFormData((prev) => ({
            ...prev,
            discount_spus: selectedSpus,
            // Nếu đang chọn sản phẩm cụ thể, tắt option áp dụng tất cả
            is_apply_all_product: applyAll
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.discount_name.trim()) {
            newErrors.discount_name = 'Vui lòng nhập tên mã giảm giá';
        }

        if (!formData.discount_code.trim()) {
            newErrors.discount_code = 'Vui lòng nhập mã giảm giá';
        } else if (formData.discount_code.length < 6 || formData.discount_code.length > 10) {
            newErrors.discount_code = 'Mã giảm giá phải từ 6 đến 10 ký tự';
        }

        if (!formData.discount_value) {
            newErrors.discount_value = 'Vui lòng nhập giá trị giảm';
        } else if (
            formData.discount_type === 'percentage' &&
            (formData.discount_value < 1 || formData.discount_value > 100)
        ) {
            newErrors.discount_value = 'Phần trăm giảm giá phải từ 1 đến 100';
        }

        if (formData.discount_count && isNaN(Number(formData.discount_count))) {
            newErrors.discount_count = 'Tổng số lượng mã phải là số';
        }

        if (!formData.discount_min_order_cost) {
            newErrors.discount_min_order_cost = 'Vui lòng nhập giá trị đơn hàng tối thiểu';
        } else if (
            isNaN(Number(formData.discount_min_order_cost)) ||
            Number(formData.discount_min_order_cost) < 0
        ) {
            newErrors.discount_min_order_cost = 'Giá trị đơn hàng tối thiểu phải là số không âm';
        }

        if (!formData.discount_start_at) {
            newErrors.discount_start_at = 'Vui lòng chọn thời gian bắt đầu';
        }

        if (!formData.discount_end_at) {
            newErrors.discount_end_at = 'Vui lòng chọn thời gian kết thúc';
        } else if (new Date(formData.discount_start_at) >= new Date(formData.discount_end_at)) {
            newErrors.discount_end_at = 'Thời gian kết thúc phải sau thời gian bắt đầu';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);
            const data = {
                ...formData,
                _id: id,
                discount_shop: undefined, // Will be set by server
                discount_count: Number(formData.discount_count) || undefined,
                discount_max_value: formData.discount_max_value
                    ? Number(formData.discount_max_value)
                    : undefined,
                discount_min_order_cost: Number(formData.discount_min_order_cost) || 0,
                discount_user_max_use: Number(formData.discount_user_max_use) || 1,
                discount_value: Number(formData.discount_value),
                // Convert datetime-local to ISO string using utility function
                discount_start_at: convertDatetimeLocalToISO(formData.discount_start_at),
                discount_end_at: convertDatetimeLocalToISO(formData.discount_end_at)
            };

            if (!data.discount_description) delete data.discount_description;
            if (!data.discount_count) delete data.discount_count;
            if (!data.discount_max_value) delete data.discount_max_value;
            if (data.is_apply_all_product) delete data.discount_spus;

            const response = await axiosClient.put(`${API_URL}/discount/update`, data);

            if (response.data && response.data.statusCode === 200) {
                showToast('Mã giảm giá được cập nhật thành công!', 'success');
                navigate(`/discounts/${id}`);
            }
        } catch (error) {
            console.error('Error updating discount:', error);
            const errorMessage =
                error.response?.data?.message ||
                'Không thể cập nhật mã giảm giá. Vui lòng thử lại.';
            showToast(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className={cx('discount-manager')}>
                <div className={cx('loading')}>Đang tải thông tin mã giảm giá...</div>
            </div>
        );
    }

    return (
        <div className={cx('discount-manager')}>
            <div className={cx('header')}>
                <div>
                    <button
                        className={cx('back-btn')}
                        onClick={() => navigate(`/discounts/${id}`)}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#f8f9fa',
                            border: '1px solid #e9ecef',
                            borderRadius: '6px',
                            color: '#666',
                            cursor: 'pointer',
                            marginBottom: '1rem'
                        }}
                    >
                        ← Quay lại
                    </button>
                    <h1>Chỉnh Sửa Mã Giảm Giá</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className={cx('discount-form')}>
                <div className={cx('form-section')}>
                    <h2>Thông tin cơ bản</h2>

                    <div className={cx('form-group', { invalid: errors.discount_name })}>
                        <label>
                            Tên mã giảm giá
                            <span className={cx('required')}>*</span>
                        </label>
                        <input
                            type="text"
                            name="discount_name"
                            value={formData.discount_name}
                            onChange={handleInputChange}
                            placeholder="Nhập tên mã giảm giá"
                        />
                        {errors.discount_name && (
                            <div className={cx('error-message')}>{errors.discount_name}</div>
                        )}
                    </div>

                    <div className={cx('form-group')}>
                        <label>Mô tả</label>
                        <textarea
                            name="discount_description"
                            value={formData.discount_description}
                            onChange={handleInputChange}
                            placeholder="Nhập mô tả mã giảm giá"
                        />
                    </div>

                    <div className={cx('form-group', { invalid: errors.discount_code })}>
                        <label>
                            Mã giảm giá
                            <span className={cx('required')}>*</span>
                        </label>
                        <input
                            type="text"
                            name="discount_code"
                            value={formData.discount_code}
                            onChange={handleInputChange}
                            placeholder="Nhập mã giảm giá (6-10 ký tự)"
                            style={{ textTransform: 'uppercase' }}
                        />
                        {errors.discount_code && (
                            <div className={cx('error-message')}>{errors.discount_code}</div>
                        )}
                    </div>
                </div>

                <div className={cx('form-section')}>
                    <h2>Thiết lập giảm giá</h2>

                    <div className={cx('form-row')}>
                        <div className={cx('form-group')}>
                            <label>
                                Loại giảm giá
                                <span className={cx('required')}>*</span>
                            </label>
                            <select
                                name="discount_type"
                                value={formData.discount_type}
                                onChange={handleInputChange}
                            >
                                <option value="percentage">Theo phần trăm</option>
                                <option value="fixed">Số tiền cố định</option>
                            </select>
                        </div>

                        <div className={cx('form-group', { invalid: errors.discount_value })}>
                            <label>
                                Giá trị giảm
                                <span className={cx('required')}>*</span>
                            </label>
                            {formData.discount_type === 'percentage' ? (
                                <div className={cx('range-container')}>
                                    <input
                                        type="range"
                                        name="discount_value"
                                        value={formData.discount_value || 1}
                                        onChange={handleInputChange}
                                        min="1"
                                        max="100"
                                        step="1"
                                        className={cx('range-slider')}
                                        style={{
                                            background: `linear-gradient(to right, #2c8c99 0%, #2c8c99 ${
                                                formData.discount_value || 1
                                            }%, #e0e0e0 ${
                                                formData.discount_value || 1
                                            }%, #e0e0e0 100%)`
                                        }}
                                    />
                                    <div className={cx('range-value')}>
                                        {formData.discount_value || 1}%
                                    </div>
                                </div>
                            ) : (
                                <input
                                    type="number"
                                    name="discount_value"
                                    value={formData.discount_value}
                                    onChange={handleInputChange}
                                    placeholder="Nhập số tiền"
                                    min="0"
                                />
                            )}
                            {errors.discount_value && (
                                <div className={cx('error-message')}>{errors.discount_value}</div>
                            )}
                        </div>
                    </div>

                    <div className={cx('form-row')}>
                        <div
                            className={cx('form-group', {
                                invalid: errors.discount_min_order_cost
                            })}
                        >
                            <label>
                                Giá trị đơn hàng tối thiểu
                                <span className={cx('required')}>*</span>
                            </label>
                            <input
                                type="number"
                                name="discount_min_order_cost"
                                value={formData.discount_min_order_cost}
                                onChange={handleInputChange}
                                placeholder="Giá trị đơn hàng tối thiểu để áp dụng mã"
                                min="0"
                            />
                            {errors.discount_min_order_cost && (
                                <div className={cx('error-message')}>
                                    {errors.discount_min_order_cost}
                                </div>
                            )}
                        </div>

                        {formData.discount_type === 'percentage' && (
                            <div className={cx('form-group')}>
                                <label>Giá trị giảm tối đa</label>
                                <input
                                    type="number"
                                    name="discount_max_value"
                                    value={formData.discount_max_value}
                                    onChange={handleInputChange}
                                    placeholder="Số tiền giảm tối đa (chỉ áp dụng cho % giảm)"
                                    min="0"
                                />
                            </div>
                        )}
                    </div>

                    <div className={cx('form-row')}>
                        <div className={cx('form-group', { invalid: errors.discount_count })}>
                            <label>Tổng số lượng mã</label>
                            <input
                                type="number"
                                name="discount_count"
                                value={formData.discount_count}
                                onChange={handleInputChange}
                                placeholder="Tổng số lần mã có thể sử dụng"
                                min="0"
                            />
                            {errors.discount_count && (
                                <div className={cx('error-message')}>{errors.discount_count}</div>
                            )}
                        </div>

                        <div className={cx('form-group')}>
                            <label>Giới hạn mỗi người dùng</label>
                            <input
                                type="number"
                                name="discount_user_max_use"
                                value={formData.discount_user_max_use}
                                onChange={handleInputChange}
                                placeholder="Số lần sử dụng tối đa cho mỗi người"
                                min="0"
                            />
                        </div>
                    </div>
                </div>

                <div className={cx('form-section')}>
                    <h2>Thời gian áp dụng</h2>

                    <div className={cx('form-row')}>
                        <div className={cx('form-group', { invalid: errors.discount_start_at })}>
                            <label>
                                Thời gian bắt đầu
                                <span className={cx('required')}>*</span>
                            </label>
                            <input
                                type="datetime-local"
                                name="discount_start_at"
                                value={formData.discount_start_at}
                                onChange={handleInputChange}
                            />
                            {errors.discount_start_at && (
                                <div className={cx('error-message')}>
                                    {errors.discount_start_at}
                                </div>
                            )}
                        </div>

                        <div className={cx('form-group', { invalid: errors.discount_end_at })}>
                            <label>
                                Thời gian kết thúc
                                <span className={cx('required')}>*</span>
                            </label>
                            <input
                                type="datetime-local"
                                name="discount_end_at"
                                value={formData.discount_end_at}
                                onChange={handleInputChange}
                            />
                            {errors.discount_end_at && (
                                <div className={cx('error-message')}>{errors.discount_end_at}</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={cx('form-section')}>
                    <h2>Chọn sản phẩm áp dụng</h2>
                    <ProductSelection
                        selectedSpus={formData.discount_spus}
                        onChange={handleSelectedSpusChange}
                    />
                </div>

                <div className={cx('form-section')}>
                    <h2>Cài đặt thêm</h2>

                    <div className={cx('checkbox-group')}>
                        <input
                            type="checkbox"
                            id="is_apply_all_product"
                            name="is_apply_all_product"
                            checked={formData.is_apply_all_product}
                            onChange={handleInputChange}
                        />
                        <label htmlFor="is_apply_all_product">Áp dụng cho tất cả sản phẩm</label>
                    </div>

                    <div className={cx('checkbox-group')}>
                        <input
                            type="checkbox"
                            id="is_publish"
                            name="is_publish"
                            checked={formData.is_publish}
                            onChange={handleInputChange}
                        />
                        <label htmlFor="is_publish">Xuất bản</label>
                    </div>

                    <div className={cx('checkbox-group')}>
                        <input
                            type="checkbox"
                            id="is_available"
                            name="is_available"
                            checked={formData.is_available}
                            onChange={handleInputChange}
                        />
                        <label htmlFor="is_available">Kích hoạt</label>
                    </div>
                </div>

                <div className={cx('footer-section')}>
                    <div className={cx('actions')}>
                        <button
                            type="button"
                            className={cx('draft-btn')}
                            onClick={() => navigate(`/discounts/${id}`)}
                            disabled={loading}
                        >
                            Hủy
                        </button>
                        <button type="submit" className={cx('submit-btn')} disabled={loading}>
                            {loading ? 'Đang cập nhật...' : 'Cập nhật mã giảm giá'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default EditDiscount;
