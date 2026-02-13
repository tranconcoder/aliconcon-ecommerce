import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './ProductManager.module.scss';
import { FaSearch, FaTrash, FaEye, FaEyeSlash, FaPlusCircle, FaEdit } from 'react-icons/fa';
import axiosClient from '../../configs/axios';
import { API_URL } from '../../configs/env.config';
import { useToast } from '../../contexts/ToastContext';

const cx = classNames.bind(styles);

function ProductManager() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const { showToast } = useToast();
    const [deleteConfirm, setDeleteConfirm] = useState({
        show: false,
        productId: null,
        productName: '',
        nameInput: '',
        timer: 5,
        timerActive: false
    });

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get('/spu/shop/own');
            if (response.data?.metadata) {
                setProducts(response.data.metadata);
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách sản phẩm:', error);
            showToast('Không thể tải danh sách sản phẩm', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    useEffect(() => {
        let interval;
        if (deleteConfirm.timerActive && deleteConfirm.timer > 0) {
            interval = setInterval(() => {
                setDeleteConfirm((prev) => ({
                    ...prev,
                    timer: prev.timer - 1
                }));
            }, 1000);
        } else if (deleteConfirm.timer === 0) {
            setDeleteConfirm((prev) => ({
                ...prev,
                timerActive: false
            }));
        }
        return () => clearInterval(interval);
    }, [deleteConfirm.timerActive, deleteConfirm.timer]);

    const openDeleteConfirm = (product) => {
        setDeleteConfirm({
            show: true,
            productId: product._id,
            productName: product.product_name,
            nameInput: '',
            timer: 5,
            timerActive: true
        });
    };

    const closeDeleteConfirm = () => {
        setDeleteConfirm({
            show: false,
            productId: null,
            productName: '',
            nameInput: '',
            timer: 5,
            timerActive: false
        });
    };

    const handleDeleteProduct = async () => {
        try {
            await axiosClient.delete(`/spu/${deleteConfirm.productId}`);
            setProducts(products.filter((product) => product._id !== deleteConfirm.productId));
            showToast('Xóa sản phẩm thành công', 'success');
            closeDeleteConfirm();
        } catch (error) {
            console.error('Lỗi khi xóa sản phẩm:', error);
            showToast('Không thể xóa sản phẩm', 'error');
        }
    };

    const handleStatusChange = async (productId, isDraft) => {
        try {
            let path = '/spu/' + (isDraft ? 'draft' : 'publish') + '/' + productId;

            await axiosClient.patch(path);

            setProducts(
                products.map((product) =>
                    product._id === productId
                        ? { ...product, is_draft: isDraft, is_publish: !isDraft }
                        : product
                )
            );
            showToast(
                isDraft ? 'Đã chuyển sản phẩm sang bản nháp' : 'Đã đăng bán sản phẩm',
                'success'
            );
        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái:', error);
            showToast('Không thể cập nhật trạng thái sản phẩm', 'error');
        }
    };

    const filteredProducts = products.filter((product) => {
        const matchesFilter =
            filter === 'all' ||
            (filter === 'published' && product.is_publish) ||
            (filter === 'draft' && product.is_draft);
        const matchesSearch = product.product_name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    // Format price to VND
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

    // Format price range
    const formatPriceRange = (minPrice, maxPrice) => {
        if (minPrice === maxPrice) {
            return formatPrice(minPrice);
        }
        return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
    };

    return (
        <div className={cx('product-manager')}>
            <div className={cx('header')}>
                <h1>Quản Lý Sản Phẩm</h1>
                <Link to="/products/new" className={cx('add-product-btn')}>
                    <FaPlusCircle /> Thêm Sản Phẩm
                </Link>
            </div>

            <div className={cx('filters-container')}>
                <div className={cx('filters')}>
                    <div className={cx('status-filters')}>
                        <button
                            className={cx('filter-btn', filter === 'all' && 'active')}
                            onClick={() => setFilter('all')}
                        >
                            Tất Cả
                        </button>
                        <button
                            className={cx('filter-btn', filter === 'published' && 'active')}
                            onClick={() => setFilter('published')}
                        >
                            Đã Đăng
                        </button>
                        <button
                            className={cx('filter-btn', filter === 'draft' && 'active')}
                            onClick={() => setFilter('draft')}
                        >
                            Bản Nháp
                        </button>
                    </div>
                    <div className={cx('search')}>
                        <FaSearch className={cx('search-icon')} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm sản phẩm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className={cx('loading-container')}>
                    <div className={cx('loading-spinner')}></div>
                    <p>Đang tải sản phẩm...</p>
                </div>
            ) : (
                <>
                    {filteredProducts.length === 0 ? (
                        <div className={cx('empty-state')}>
                            <div className={cx('empty-icon')}>📦</div>
                            <h3>Không tìm thấy sản phẩm nào</h3>
                            <p>
                                {filter === 'all'
                                    ? 'Hãy thêm sản phẩm đầu tiên vào cửa hàng của bạn.'
                                    : 'Không có sản phẩm phù hợp với bộ lọc hiện tại.'}
                            </p>
                            {filter !== 'all' && (
                                <button
                                    onClick={() => setFilter('all')}
                                    className={cx('reset-filter-btn')}
                                >
                                    Xóa bộ lọc
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className={cx('products-grid')}>
                            {filteredProducts.map((product) => (
                                <div key={product._id} className={cx('product-card')}>
                                    <div className={cx('product-image')}>
                                        <img
                                            src={`${API_URL}/media/${product.product_thumb}`}
                                            alt={product.product_name}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src =
                                                    'https://via.placeholder.com/150x150?text=Ảnh+sản+phẩm';
                                            }}
                                        />
                                        <div
                                            className={cx('product-status-badge', {
                                                'is-published': product.is_publish,
                                                'is-draft': product.is_draft
                                            })}
                                        >
                                            {product.is_publish ? 'Đang bán' : 'Bản nháp'}
                                        </div>
                                    </div>
                                    <div className={cx('product-content')}>
                                        <h3 className={cx('product-name')}>
                                            {product.product_name}
                                        </h3>
                                        <div className={cx('product-meta')}>
                                            <div className={cx('product-price')}>
                                                {formatPriceRange(
                                                    product.minPrice,
                                                    product.maxPrice
                                                )}
                                            </div>
                                            <div className={cx('product-quantity')}>
                                                <span>{product.product_quantity} sp</span>
                                            </div>
                                        </div>
                                        <div className={cx('product-actions')}>
                                            <Link
                                                to={`/products/edit/${product._id}`}
                                                className={cx('edit-btn')}
                                                title="Chỉnh sửa sản phẩm"
                                            >
                                                <FaEdit /> Sửa
                                            </Link>
                                            <button
                                                className={cx('visibility-btn', {
                                                    'is-published': product.is_publish
                                                })}
                                                onClick={() =>
                                                    handleStatusChange(
                                                        product._id,
                                                        !product.is_draft
                                                    )
                                                }
                                                title={
                                                    product.is_publish
                                                        ? 'Chuyển sang bản nháp'
                                                        : 'Đăng sản phẩm'
                                                }
                                            >
                                                {product.is_publish ? <FaEyeSlash /> : <FaEye />}
                                                {product.is_publish ? 'Ẩn' : 'Hiện'}
                                            </button>
                                            <button
                                                className={cx('delete-btn')}
                                                onClick={() => openDeleteConfirm(product)}
                                                title="Xóa sản phẩm"
                                            >
                                                <FaTrash /> Xóa
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {deleteConfirm.show && (
                <div className={cx('delete-dialog-overlay')}>
                    <div className={cx('delete-dialog')}>
                        <h3>Xác nhận xóa sản phẩm</h3>
                        <p>
                            Bạn có chắc chắn muốn xóa sản phẩm này? Hành động này không thể hoàn
                            tác.
                        </p>
                        <p>
                            Nhập tên sản phẩm để xác nhận:{' '}
                            <strong>{deleteConfirm.productName}</strong>
                        </p>
                        <input
                            type="text"
                            value={deleteConfirm.nameInput}
                            onChange={(e) =>
                                setDeleteConfirm((prev) => ({ ...prev, nameInput: e.target.value }))
                            }
                            placeholder="Nhập tên sản phẩm"
                            className={cx('confirm-input')}
                        />
                        <div className={cx('dialog-actions')}>
                            <button className={cx('cancel-btn')} onClick={closeDeleteConfirm}>
                                Hủy
                            </button>
                            <button
                                className={cx('delete-btn')}
                                disabled={
                                    deleteConfirm.nameInput !== deleteConfirm.productName ||
                                    deleteConfirm.timer > 0
                                }
                                onClick={handleDeleteProduct}
                            >
                                {deleteConfirm.timer > 0
                                    ? `Xóa (${deleteConfirm.timer}s)`
                                    : 'Xóa sản phẩm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProductManager;
