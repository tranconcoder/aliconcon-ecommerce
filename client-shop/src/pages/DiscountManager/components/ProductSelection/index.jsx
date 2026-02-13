import React, { useState, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from './ProductSelection.module.scss';
import axiosClient from '../../../../configs/axios';
import { API_URL } from '../../../../configs/env.config';


const cx = classNames.bind(styles);

const ProductSelection = ({ selectedSpus, onChange }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectAll, setSelectAll] = useState(true);
    const [showProductList, setShowProductList] = useState(false);


    useEffect(() => {
        // Mặc định chọn tất cả và không hiển thị danh sách
        setSelectAll(true);
        setShowProductList(false);
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const LIMIT_GET = 50; // Tăng số lượng sản phẩm hiển thị
            const response = await axiosClient.get(
                `${API_URL}/spu/shop/own?limit=${LIMIT_GET}`,
                {}
            );
            if (response.data && response.data.data) {
                setProducts(response.data.data);
                // Nếu đã chọn "select all" thì tự động chọn tất cả sản phẩm
                if (selectAll) {
                    const allProductIds = response.data.data.map((product) => product._id);
                    onChange(allProductIds, true);
                }
            } else if (response.data && response.data.metadata) {
                setProducts(response.data.metadata);
                if (selectAll) {
                    const allProductIds = response.data.metadata.map((product) => product._id);
                    onChange(allProductIds, true);
                }
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (e) => {
        const checked = e.target.checked;
        setSelectAll(checked);
        setShowProductList(!checked);

        if (checked) {
            // Nếu đã có dữ liệu sản phẩm
            if (products.length > 0) {
                const allProductIds = products.map((product) => product._id);
                onChange(allProductIds, true);
            }
            // Không cần gọi API khi chọn tất cả
        } else {
            // Khi bỏ chọn tất cả, gọi API để lấy danh sách sản phẩm
            onChange([], false);
            if (products.length === 0) {
                fetchProducts();
            }
        }
    };

    const handleSelectProduct = (productId) => {
        let newSelectedProducts;
        if (selectedSpus.includes(productId)) {
            // Remove if already selected
            newSelectedProducts = selectedSpus.filter((id) => id !== productId);
        } else {
            // Add if not selected
            newSelectedProducts = [...selectedSpus, productId];
        }

        // Cập nhật trạng thái "Chọn tất cả"
        setSelectAll(newSelectedProducts.length === products.length && products.length > 0);
        onChange(newSelectedProducts);
    };

    // Hàm xử lý khi click vào sản phẩm (thay vì chỉ click vào checkbox)
    const handleProductClick = (productId) => {
        handleSelectProduct(productId);
    };

    const filteredProducts = products.filter(
        (product) =>
            product.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.product_description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

    if (loading) {
        return <div>Đang tải danh sách sản phẩm...</div>;
    }

    return (
        <div className={cx('product-selection')}>
            <div className={cx('search-box')}>
                <span className={cx('search-icon')}>
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M14 14L11 11"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>
                <input
                    type="text"
                    placeholder="Tìm kiếm sản phẩm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className={cx('select-all')}>
                <input
                    type="checkbox"
                    id="select-all"
                    checked={selectAll}
                    onChange={handleSelectAll}
                />
                <label htmlFor="select-all">Chọn tất cả sản phẩm</label>
            </div>

            {showProductList && (
                <div className={cx('product-list')}>
                    {filteredProducts.map((product) => (
                        <div
                            key={product._id}
                            className={cx('product-item', {
                                selected: selectedSpus.includes(product._id)
                            })}
                            onClick={() => handleProductClick(product._id)}
                        >
                            <div className={cx('check-mark')}>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <div className={cx('checkbox-wrapper')}>
                                <input
                                    type="checkbox"
                                    checked={selectedSpus.includes(product._id)}
                                    onChange={() => handleSelectProduct(product._id)}
                                />
                            </div>
                            <div className={cx('product-info')}>
                                <div className={cx('product-name')}>{product.product_name}</div>
                                {product.product_thumb && (
                                    <div className={cx('product-image')}>
                                        <img
                                            src={`${API_URL}/media/${product.product_thumb}`}
                                            alt={product.product_name}
                                        />
                                    </div>
                                )}
                                <div className={cx('product-price')}>
                                    {product.product_price && formatPrice(product.product_price)}
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredProducts.length === 0 && (
                        <div
                            style={{
                                padding: '1rem',
                                textAlign: 'center',
                                color: '#666',
                                gridColumn: '1 / -1'
                            }}
                        >
                            Không tìm thấy sản phẩm nào
                        </div>
                    )}

                    {loading && (
                        <div
                            style={{
                                padding: '1rem',
                                textAlign: 'center',
                                color: '#666',
                                gridColumn: '1 / -1'
                            }}
                        >
                            Đang tải danh sách sản phẩm...
                        </div>
                    )}
                </div>
            )}

            {!showProductList && !loading && (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                    <p>
                        Đã chọn tất cả sản phẩm. Bỏ chọn "Chọn tất cả" để hiển thị danh sách sản
                        phẩm.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ProductSelection;
