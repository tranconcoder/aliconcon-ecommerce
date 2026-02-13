import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './ProductEdit.module.scss';
import {
    FaArrowLeft,
    FaSave,
    FaPlus,
    FaTrash,
    FaEdit,
    FaImage,
    FaBox,
    FaTag,
    FaInfoCircle,
    FaUpload,
    FaEye,
    FaEyeSlash
} from 'react-icons/fa';
import axiosClient from '../../configs/axios';
import { useToast } from '../../contexts/ToastContext';
import { getMediaUrl } from '../../utils/media';
import MarkdownEditor from '../../components/MarkdownEditor';

const cx = classNames.bind(styles);

const ProductEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    // State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [productData, setProductData] = useState(null);
    const [categories, setCategories] = useState([]);
    const [activeTab, setActiveTab] = useState('basic');

    // Form state
    const [formData, setFormData] = useState({
        product_name: '',
        product_category: '',
        product_description: '',
        is_draft: true,
        is_publish: false,

        // Separated product attributes
        product_attributes_to_add: [],
        product_attributes_to_update: [],
        product_attributes_to_remove: [],

        sku_updates: [],
        sku_images_map: []
    });

    // UI state
    const [newAttribute, setNewAttribute] = useState({ attr_name: '', attr_value: '' });
    const [editingAttributes, setEditingAttributes] = useState({});

    // File uploads
    const [productThumb, setProductThumb] = useState(null);
    const [productImages, setProductImages] = useState([]);
    const [skuFiles, setSKUFiles] = useState({
        thumbs: {},
        imagesToAdd: {},
        imagesToReplace: {}
    });

    // Image previews
    const [imagePreview, setImagePreview] = useState({
        productThumb: null,
        productImages: []
    });

    const fetchProductData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axiosClient.get(`/spu/${id}`);
            const product = response.data.metadata;

            setProductData(product);

            setFormData({
                product_name: product.product_name || '',
                product_category: product.product_category || '',
                product_description: product.product_description || '',
                is_draft: product.is_draft,
                is_publish: product.is_publish,

                product_attributes_to_add: [],
                product_attributes_to_update: [],
                product_attributes_to_remove: [],

                sku_updates: (product.sku_list || []).map((sku) => ({
                    sku_id: sku._id,
                    sku_price: sku.sku_price,
                    sku_stock: sku.sku_stock,
                    sku_tier_idx: sku.sku_tier_idx || [],
                    sku_images_to_remove: [],
                    sku_images_to_replace: []
                })),
                sku_images_map: new Array(product.sku_list?.length || 0).fill(0)
            });

            // Set up editing state for existing attributes
            const editingState = {};
            (product.product_attributes || []).forEach((attr, index) => {
                editingState[index] = false;
            });
            setEditingAttributes(editingState);
        } catch (error) {
            console.error('Error fetching product:', error);
            showToast('Không thể tải thông tin sản phẩm', 'error');
        } finally {
            setLoading(false);
        }
    }, [id, showToast]);

    const fetchCategories = useCallback(async () => {
        try {
            const response = await axiosClient.get('/category');
            setCategories(response.data.metadata || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }, []);

    useEffect(() => {
        fetchProductData();
        fetchCategories();
    }, [fetchProductData, fetchCategories]);

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value
        }));
    };

    // Product attributes management
    const addNewAttribute = () => {
        if (!newAttribute.attr_name.trim() || !newAttribute.attr_value.trim()) {
            showToast('Vui lòng nhập đầy đủ tên và giá trị thuộc tính', 'error');
            return;
        }

        setFormData((prev) => ({
            ...prev,
            product_attributes_to_add: [...prev.product_attributes_to_add, { ...newAttribute }]
        }));

        setNewAttribute({ attr_name: '', attr_value: '' });
        showToast('Đã thêm thuộc tính mới', 'success');
    };

    const startEditingAttribute = (index) => {
        setEditingAttributes((prev) => ({
            ...prev,
            [index]: true
        }));
    };

    const saveAttributeEdit = (index, updatedAttr) => {
        const existingAttr = productData.product_attributes[index];

        // Update formData for backend
        setFormData((prev) => ({
            ...prev,
            product_attributes_to_update: [
                ...prev.product_attributes_to_update.filter(
                    (attr) => attr.attr_id !== existingAttr._id
                ),
                {
                    attr_id: existingAttr._id,
                    attr_name: updatedAttr.attr_name,
                    attr_value: updatedAttr.attr_value
                }
            ]
        }));

        // Update productData for UI display
        setProductData((prev) => ({
            ...prev,
            product_attributes: prev.product_attributes.map((attr, i) =>
                i === index
                    ? {
                          ...attr,
                          attr_name: updatedAttr.attr_name,
                          attr_value: updatedAttr.attr_value
                      }
                    : attr
            )
        }));

        setEditingAttributes((prev) => ({
            ...prev,
            [index]: false
        }));

        showToast('Đã cập nhật thuộc tính', 'success');
    };

    const removeAttribute = (index, isNew = false) => {
        if (isNew) {
            // Remove from add list
            setFormData((prev) => ({
                ...prev,
                product_attributes_to_add: prev.product_attributes_to_add.filter(
                    (_, i) => i !== index
                )
            }));
        } else {
            // Mark existing attribute for removal
            const existingAttr = productData.product_attributes[index];
            setFormData((prev) => ({
                ...prev,
                product_attributes_to_remove: [
                    ...prev.product_attributes_to_remove,
                    existingAttr._id
                ]
            }));
        }
        showToast('Đã xóa thuộc tính', 'success');
    };

    // SKU management
    const handleSKUChange = (index, field, value) => {
        setFormData((prev) => ({
            ...prev,
            sku_updates: prev.sku_updates.map((sku, i) =>
                i === index ? { ...sku, [field]: value } : sku
            )
        }));
    };



    const handleFileUpload = (type, files, skuIndex = null) => {
        if (type === 'product_thumb') {
            setProductThumb(files[0]);
            setImagePreview((prev) => ({
                ...prev,
                productThumb: URL.createObjectURL(files[0])
            }));
        } else if (type === 'product_images') {
            const fileArray = Array.from(files);
            setProductImages(fileArray);
            setImagePreview((prev) => ({
                ...prev,
                productImages: fileArray.map((file) => URL.createObjectURL(file))
            }));
        } else if (type === 'sku_thumb' && skuIndex !== null) {
            setSKUFiles((prev) => ({
                ...prev,
                thumbs: { ...prev.thumbs, [skuIndex]: files[0] }
            }));
        } else if (type === 'sku_images_add' && skuIndex !== null) {
            const fileArray = Array.from(files);
            setSKUFiles((prev) => ({
                ...prev,
                imagesToAdd: { ...prev.imagesToAdd, [skuIndex]: fileArray }
            }));

            // Update sku_images_map - FIX: Chỉ cập nhật SKU cụ thể, giữ nguyên các SKU khác
            setFormData((prev) => {
                const newSkuImagesMap = [...prev.sku_images_map];
                newSkuImagesMap[skuIndex] = fileArray.length;
                return {
                    ...prev,
                    sku_images_map: newSkuImagesMap
                };
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);
            const formDataToSend = new FormData();

            // Add basic product data
            if (formData.product_name) formDataToSend.append('product_name', formData.product_name);
            if (formData.product_category)
                formDataToSend.append('product_category', formData.product_category);
            if (formData.product_description)
                formDataToSend.append('product_description', formData.product_description);

            formDataToSend.append('is_draft', formData.is_draft);
            formDataToSend.append('is_publish', formData.is_publish);

            // Add product attributes
            if (formData.product_attributes_to_add.length > 0) {
                formDataToSend.append(
                    'product_attributes_to_add',
                    JSON.stringify(formData.product_attributes_to_add)
                );
            }
            if (formData.product_attributes_to_update.length > 0) {
                formDataToSend.append(
                    'product_attributes_to_update',
                    JSON.stringify(formData.product_attributes_to_update)
                );
            }
            if (formData.product_attributes_to_remove.length > 0) {
                formDataToSend.append(
                    'product_attributes_to_remove',
                    JSON.stringify(formData.product_attributes_to_remove)
                );
            }

            // Add SKU updates
            if (formData.sku_updates.length > 0) {
                formDataToSend.append('sku_updates', JSON.stringify(formData.sku_updates));
            }

            // Add images
            if (productThumb) {
                formDataToSend.append('product_thumb', productThumb);
            }

            productImages.forEach((file) => {
                formDataToSend.append('product_images', file);
            });

            // Add SKU files
            Object.entries(skuFiles.thumbs).forEach(([skuIndex, file]) => {
                formDataToSend.append('sku_thumb', file);
            });

            Object.entries(skuFiles.imagesToAdd).forEach(([skuIndex, files]) => {
                files.forEach((file) => {
                    formDataToSend.append('sku_images_to_add', file);
                });
            });

            Object.entries(skuFiles.imagesToReplace).forEach(([skuIndex, files]) => {
                files.forEach((file) => {
                    formDataToSend.append('sku_images_to_replace', file);
                });
            });

            // Add SKU images map
            if (formData.sku_images_map.some((count) => count > 0)) {
                formDataToSend.append('sku_images_map', JSON.stringify(formData.sku_images_map));
            }

            await axiosClient.put(`/spu/update/${id}`, formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            showToast('Cập nhật sản phẩm thành công!', 'success');
            navigate('/products');
        } catch (error) {
            console.error('Error updating product:', error);
            showToast(
                error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật sản phẩm',
                'error'
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className={cx('loading')}>
                <div className={cx('spinner')}></div>
                <p>Đang tải thông tin sản phẩm...</p>
            </div>
        );
    }

    if (!productData) {
        return (
            <div className={cx('error')}>
                <h2>Không tìm thấy sản phẩm</h2>
                <Link to="/products" className={cx('back-link')}>
                    ← Quay lại danh sách sản phẩm
                </Link>
            </div>
        );
    }

    return (
        <div className={cx('product-edit')}>
            <div className={cx('edit-container')}>
                {/* Header */}
                <div className={cx('page-header')}>
                    <div className={cx('header-top')}>
                        <Link to="/products" className={cx('back-link')}>
                            <FaArrowLeft /> Quay lại
                        </Link>
                        <div className={cx('header-content')}>
                            <h1>Chỉnh sửa sản phẩm</h1>
                            <div className={cx('product-meta')}>
                                <span className={cx('product-id')}>ID: {id}</span>
                                <div className={cx('status-badges')}>
                                    <span
                                        className={cx(
                                            'badge',
                                            formData.is_draft ? 'draft' : 'published'
                                        )}
                                    >
                                        {formData.is_draft ? 'Bản nháp' : 'Đã đăng'}
                                    </span>
                                    <span
                                        className={cx(
                                            'badge',
                                            formData.is_publish ? 'public' : 'private'
                                        )}
                                    >
                                        {formData.is_publish ? (
                                            <>
                                                <FaEye /> Công khai
                                            </>
                                        ) : (
                                            <>
                                                <FaEyeSlash /> Riêng tư
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className={cx('tab-navigation')}>
                    <button
                        className={cx('tab-button', { active: activeTab === 'basic' })}
                        onClick={() => setActiveTab('basic')}
                    >
                        <FaInfoCircle /> Thông tin cơ bản
                    </button>
                    <button
                        className={cx('tab-button', { active: activeTab === 'attributes' })}
                        onClick={() => setActiveTab('attributes')}
                    >
                        <FaTag /> Thuộc tính
                    </button>
                    <button
                        className={cx('tab-button', { active: activeTab === 'images' })}
                        onClick={() => setActiveTab('images')}
                    >
                        <FaImage /> Hình ảnh
                    </button>
                    <button
                        className={cx('tab-button', { active: activeTab === 'sku' })}
                        onClick={() => setActiveTab('sku')}
                    >
                        <FaBox /> Quản lý SKU
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={cx('edit-form')}>
                    {/* Basic Information Tab */}
                    {activeTab === 'basic' && (
                        <div className={cx('form-section', 'tab-content')}>
                            <div className={cx('section-header')}>
                                <h3>
                                    <FaInfoCircle /> Thông tin cơ bản
                                </h3>
                            </div>

                            <div className={cx('form-grid')}>
                                <div className={cx('form-group')}>
                                    <label>Tên sản phẩm *</label>
                                    <input
                                        type="text"
                                        value={formData.product_name}
                                        onChange={(e) =>
                                            handleInputChange('product_name', e.target.value)
                                        }
                                        placeholder="Nhập tên sản phẩm"
                                        required
                                    />
                                </div>

                                <div className={cx('form-group')}>
                                    <label>Danh mục *</label>
                                    <select
                                        value={formData.product_category}
                                        onChange={(e) =>
                                            handleInputChange('product_category', e.target.value)
                                        }
                                        required
                                    >
                                        <option value="">Chọn danh mục</option>
                                        {categories.map((cat) => (
                                            <option key={cat._id} value={cat._id}>
                                                {cat.category_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <MarkdownEditor
                                label="Mô tả sản phẩm"
                                value={formData.product_description}
                                onChange={(value) =>
                                    handleInputChange('product_description', value)
                                }
                                placeholder="Nhập mô tả chi tiết về sản phẩm... Hỗ trợ Markdown"
                                height={200}
                                helpText="Sử dụng Markdown để định dạng văn bản. Ví dụ: **in đậm**, *in nghiêng*, # Tiêu đề"
                            />

                            <div className={cx('form-group', 'checkbox-group')}>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.is_draft}
                                        onChange={(e) =>
                                            handleInputChange('is_draft', e.target.checked)
                                        }
                                    />
                                    Lưu dưới dạng bản nháp
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.is_publish}
                                        onChange={(e) =>
                                            handleInputChange('is_publish', e.target.checked)
                                        }
                                    />
                                    Đăng bán công khai
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Product Attributes Tab */}
                    {activeTab === 'attributes' && (
                        <div className={cx('form-section', 'tab-content')}>
                            <div className={cx('section-header')}>
                                <h3>
                                    <FaTag /> Thuộc tính sản phẩm
                                </h3>
                            </div>

                            {/* Add new attribute */}
                            <div className={cx('add-attribute-section')}>
                                <h4>Thêm thuộc tính mới</h4>
                                <div className={cx('attribute-input-row')}>
                                    <input
                                        type="text"
                                        className={cx('attribute-input')}
                                        placeholder="Tên thuộc tính (VD: Màu sắc, Kích thước...)"
                                        value={newAttribute.attr_name}
                                        onChange={(e) =>
                                            setNewAttribute((prev) => ({
                                                ...prev,
                                                attr_name: e.target.value
                                            }))
                                        }
                                    />
                                    <input
                                        type="text"
                                        className={cx('attribute-input')}
                                        placeholder="Giá trị (VD: Đỏ, XL...)"
                                        value={newAttribute.attr_value}
                                        onChange={(e) =>
                                            setNewAttribute((prev) => ({
                                                ...prev,
                                                attr_value: e.target.value
                                            }))
                                        }
                                    />
                                    <button
                                        type="button"
                                        onClick={addNewAttribute}
                                        className={cx('add-btn')}
                                    >
                                        <FaPlus /> Thêm
                                    </button>
                                </div>
                            </div>

                            {/* Existing attributes */}
                            {productData.product_attributes &&
                                productData.product_attributes.length > 0 && (
                                    <div className={cx('existing-attributes')}>
                                        <h4>Thuộc tính hiện có</h4>
                                        {productData.product_attributes.map((attr, index) => {
                                            const isMarkedForRemoval =
                                                formData.product_attributes_to_remove.includes(
                                                    attr._id
                                                );
                                            const isEditing = editingAttributes[index];

                                            if (isMarkedForRemoval) return null;

                                            return (
                                                <AttributeItem
                                                    key={attr._id}
                                                    attribute={attr}
                                                    index={index}
                                                    isEditing={isEditing}
                                                    onStartEdit={() => startEditingAttribute(index)}
                                                    onSaveEdit={(updatedAttr) =>
                                                        saveAttributeEdit(index, updatedAttr)
                                                    }
                                                    onRemove={() => removeAttribute(index, false)}
                                                    onCancelEdit={() =>
                                                        setEditingAttributes((prev) => ({
                                                            ...prev,
                                                            [index]: false
                                                        }))
                                                    }
                                                />
                                            );
                                        })}
                                    </div>
                                )}

                            {/* New attributes to be added */}
                            {formData.product_attributes_to_add.length > 0 && (
                                <div className={cx('new-attributes')}>
                                    <h4>Thuộc tính mới sẽ được thêm</h4>
                                    {formData.product_attributes_to_add.map((attr, index) => (
                                        <div key={index} className={cx('attribute-row', 'new')}>
                                            <span className={cx('attr-name')}>
                                                {attr.attr_name}
                                            </span>
                                            <span className={cx('attr-value')}>
                                                {attr.attr_value}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeAttribute(index, true)}
                                                className={cx('remove-btn')}
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Images Tab */}
                    {activeTab === 'images' && (
                        <div className={cx('form-section', 'tab-content')}>
                            <div className={cx('section-header')}>
                                <h3>
                                    <FaImage /> Quản lý hình ảnh
                                </h3>
                            </div>

                            <div className={cx('images-grid')}>
                                {/* Product Thumbnail */}
                                <div className={cx('image-upload-section')}>
                                    <h4>Ảnh đại diện sản phẩm</h4>
                                    <div className={cx('upload-area')}>
                                        {imagePreview.productThumb ? (
                                            <div className={cx('image-preview')}>
                                                <img
                                                    src={imagePreview.productThumb}
                                                    alt="Product thumbnail"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setProductThumb(null);
                                                        setImagePreview((prev) => ({
                                                            ...prev,
                                                            productThumb: null
                                                        }));
                                                    }}
                                                    className={cx('remove-image-btn')}
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        ) : productData.product_thumb ? (
                                            <div className={cx('current-image')}>
                                                <img
                                                    src={getMediaUrl(
                                                        productData.product_thumb?._id ||
                                                            productData.product_thumb
                                                    )}
                                                    alt="Current thumbnail"
                                                    onError={(e) => {
                                                        console.error(
                                                            '❌ Thumbnail image failed to load:',
                                                            productData.product_thumb
                                                        );
                                                        e.target.style.border = '2px solid red';
                                                    }}
                                                />
                                                <span>Ảnh hiện tại</span>
                                            </div>
                                        ) : (
                                            <div>
                                                {console.log(
                                                    '⚠️ No product thumb found:',
                                                    productData.product_thumb
                                                )}
                                                <p>Không có ảnh đại diện</p>
                                            </div>
                                        )}

                                        <label className={cx('upload-button')}>
                                            <FaUpload /> Chọn ảnh đại diện
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) =>
                                                    handleFileUpload(
                                                        'product_thumb',
                                                        e.target.files
                                                    )
                                                }
                                                hidden
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Product Images */}
                                <div className={cx('image-upload-section')}>
                                    <h4>Ảnh sản phẩm (tối đa 10 ảnh)</h4>
                                    <div className={cx('upload-area')}>
                                        {imagePreview.productImages.length > 0 && (
                                            <div className={cx('image-grid')}>
                                                {imagePreview.productImages.map((src, index) => (
                                                    <div
                                                        key={index}
                                                        className={cx('image-preview')}
                                                    >
                                                        <img
                                                            src={src}
                                                            alt={`Product ${index + 1}`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {productData.product_images &&
                                            productData.product_images.length > 0 &&
                                            !imagePreview.productImages.length && (
                                                <div className={cx('current-images')}>
                                                    <p>Ảnh hiện tại:</p>
                                                    <div className={cx('image-grid')}>
                                                        {productData.product_images.map(
                                                            (img, index) => {
                                                                console.log(
                                                                    `🖼️ Product image ${index}:`,
                                                                    img
                                                                );
                                                                return (
                                                                    <img
                                                                        key={index}
                                                                        src={getMediaUrl(
                                                                            img?._id || img
                                                                        )}
                                                                        alt={`Current ${index + 1}`}
                                                                        onError={(e) => {
                                                                            console.error(
                                                                                '❌ Product image failed to load:',
                                                                                img
                                                                            );
                                                                            e.target.style.border =
                                                                                '2px solid red';
                                                                        }}
                                                                        onLoad={() => {
                                                                            console.log(
                                                                                '✅ Product image loaded:',
                                                                                getMediaUrl(img)
                                                                            );
                                                                        }}
                                                                    />
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                        {/* Debug: Show when no images */}
                                        {(!productData.product_images ||
                                            productData.product_images.length === 0) && (
                                            <div
                                                style={{
                                                    padding: '10px',
                                                    border: '1px dashed #ccc',
                                                    margin: '10px 0'
                                                }}
                                            >
                                                {console.log(
                                                    '⚠️ No product images found:',
                                                    productData.product_images
                                                )}
                                                <p>Không có ảnh sản phẩm hiện tại</p>
                                            </div>
                                        )}

                                        <label className={cx('upload-button')}>
                                            <FaUpload /> Chọn ảnh sản phẩm
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={(e) =>
                                                    handleFileUpload(
                                                        'product_images',
                                                        e.target.files
                                                    )
                                                }
                                                hidden
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SKU Management Tab */}
                    {activeTab === 'sku' && (
                        <div className={cx('form-section', 'tab-content')}>
                            <div className={cx('section-header')}>
                                <h3>
                                    <FaBox /> Quản lý SKU
                                </h3>
                            </div>

                            <div className={cx('sku-list')}>
                                {formData.sku_updates.map((sku, index) => (
                                    <SKUEditCard
                                        key={sku.sku_id}
                                        sku={sku}
                                        skuIndex={index}
                                        productData={productData}
                                        skuFiles={skuFiles}
                                        onChange={(field, value) =>
                                            handleSKUChange(index, field, value)
                                        }
                                        onFileUpload={(type, files) =>
                                            handleFileUpload(type, files, index)
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className={cx('form-actions')}>
                        <button type="submit" disabled={saving} className={cx('save-btn')}>
                            <FaSave /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Component for editing individual attributes
const AttributeItem = ({
    attribute,
    index,
    isEditing,
    onStartEdit,
    onSaveEdit,
    onRemove,
    onCancelEdit
}) => {
    const [editValues, setEditValues] = useState({
        attr_name: attribute.attr_name,
        attr_value: attribute.attr_value
    });

    useEffect(() => {
        setEditValues({
            attr_name: attribute.attr_name,
            attr_value: attribute.attr_value
        });
    }, [attribute]);

    if (isEditing) {
        return (
            <div className={cx('attribute-row', 'editing')}>
                <input
                    type="text"
                    className={cx('attribute-input')}
                    placeholder="Tên thuộc tính"
                    value={editValues.attr_name}
                    onChange={(e) =>
                        setEditValues((prev) => ({ ...prev, attr_name: e.target.value }))
                    }
                />
                <input
                    type="text"
                    className={cx('attribute-input')}
                    placeholder="Giá trị thuộc tính"
                    value={editValues.attr_value}
                    onChange={(e) =>
                        setEditValues((prev) => ({ ...prev, attr_value: e.target.value }))
                    }
                />
                <div className={cx('action-buttons')}>
                    <button
                        type="button"
                        onClick={() => onSaveEdit(editValues)}
                        className={cx('save-btn', 'small')}
                    >
                        <FaSave />
                    </button>
                    <button type="button" onClick={onCancelEdit} className={cx('cancel-btn')}>
                        ×
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={cx('attribute-row')}>
            <span className={cx('attr-name')}>{attribute.attr_name}</span>
            <span className={cx('attr-value')}>{attribute.attr_value}</span>
            <div className={cx('action-buttons')}>
                <button type="button" onClick={onStartEdit} className={cx('edit-btn')}>
                    <FaEdit />
                </button>
                <button type="button" onClick={onRemove} className={cx('remove-btn')}>
                    <FaTrash />
                </button>
            </div>
        </div>
    );
};

// Component for editing individual SKUs
const SKUEditCard = ({ sku, skuIndex, productData, skuFiles, onChange, onFileUpload }) => {
    const originalSku = productData.sku_list?.find((s) => s._id === sku.sku_id);

    return (
        <div className={cx('sku-card')}>
            <div className={cx('sku-header')}>
                <h4>SKU #{skuIndex + 1}</h4>
                <span className={cx('sku-id')}>ID: {sku.sku_id}</span>
            </div>

            <div className={cx('sku-content')}>
                <div className={cx('sku-form-grid')}>
                    <div className={cx('form-group')}>
                        <label>Giá (VNĐ)</label>
                        <input
                            type="number"
                            value={sku.sku_price}
                            onChange={(e) => onChange('sku_price', Number(e.target.value))}
                            min="0"
                            step="1000"
                        />
                    </div>

                    <div className={cx('form-group')}>
                        <label>Số lượng</label>
                        <input
                            type="number"
                            value={sku.sku_stock}
                            onChange={(e) => onChange('sku_stock', Number(e.target.value))}
                            min="0"
                        />
                    </div>
                </div>

                {/* SKU Images */}
                <div className={cx('sku-images-section')}>
                    <h5>Ảnh SKU</h5>

                    {/* Current SKU Images */}
                    {originalSku?.sku_images && originalSku.sku_images.length > 0 && (
                        <div className={cx('current-sku-images')}>
                            <p>Ảnh hiện tại:</p>
                            <div className={cx('image-grid', 'small')}>
                                {originalSku.sku_images.map((img, imgIndex) => (
                                    <div key={imgIndex} className={cx('image-preview', 'small')}>
                                        <img src={getMediaUrl(img)} alt={`SKU ${imgIndex + 1}`} />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const currentRemovals =
                                                    sku.sku_images_to_remove || [];
                                                onChange('sku_images_to_remove', [
                                                    ...currentRemovals,
                                                    img._id
                                                ]);
                                            }}
                                            className={cx('remove-image-btn')}
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upload new images */}
                    <label className={cx('upload-button', 'small')}>
                        <FaUpload /> Thêm ảnh mới
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => onFileUpload('sku_images_add', e.target.files)}
                            hidden
                        />
                    </label>

                    {skuFiles.imagesToAdd[skuIndex] && (
                        <div className={cx('new-images-preview')}>
                            <p>Ảnh mới sẽ được thêm:</p>
                            <div className={cx('image-grid', 'small')}>
                                {skuFiles.imagesToAdd[skuIndex].map((file, imgIndex) => (
                                    <div key={imgIndex} className={cx('image-preview', 'small')}>
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt={`New ${imgIndex + 1}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductEditPage;
