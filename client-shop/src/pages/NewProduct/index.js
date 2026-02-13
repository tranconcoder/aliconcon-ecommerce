import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './NewProduct.module.scss';
import axios from 'axios';
import { API_URL } from '../../configs/env.config';
import BasicInformation from './components/BasicInformation/index';
import ProductImages from './components/ProductImages/index';
import PricingInventory from './components/PricingInventory/index';
import ProductVariations from './components/ProductVariations/index';
import ProductAttributes from './components/ProductAttributes/index';
import ProductSummary from './components/ProductSummary/index';
import SKUManagement from './components/SKUManagement/index';
import axiosClient from '../../configs/axios';

const cx = classNames.bind(styles);

function NewProduct() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        product_name: '',
        product_description: '',
        product_category: '',
        product_attributes: [],
        product_variations: [],
        product_thumb: null,
        product_images: [],
        is_draft: true,
        is_publish: false,
        sku_list: [
            {
                sku_tier_idx: [],
                selected_options: {},
                thumb: null,
                images: [],
                sku_stock: 0,
                sku_price: '',
                warehouse: '' // Added warehouse field inside SKU
            }
        ]
    });

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);
                console.log('🔗 Fetching categories from HTTPS API:', API_URL);
                const response = await axios.get(`${API_URL}/category?active=true`);
                if (response.data && response.data.metadata) {
                    setCategories(response.data.metadata);
                    console.log('✅ Categories fetched successfully via HTTPS');
                }
            } catch (error) {
                console.error('❌ Error fetching categories via HTTPS:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleNumberChange = (e) => {
        const { name, value } = e.target;
        const numValue = value === '' ? 0 : Number(value);
        setFormData((prev) => ({
            ...prev,
            [name]: numValue
        }));
    };

    const handleAttributeChange = (e) => {
        const { name, value } = e.target;
        // Check if the change is for product_attributes
        if (name === 'product_attributes') {
            setFormData((prev) => ({
                ...prev,
                product_attributes: value
            }));
        } else if (name.startsWith('attr_')) {
            // Handle attribute updates coming from the ProductAttributes component
            // This assumes attributes are being added with a name like attr_key or attr_value
            const [, index, field] = name.split('_');

            setFormData((prev) => {
                const updatedAttributes = [...(prev.product_attributes || [])];
                if (!updatedAttributes[index]) {
                    updatedAttributes[index] = { key: '', value: '' };
                }
                updatedAttributes[index][field] = value;
                return {
                    ...prev,
                    product_attributes: updatedAttributes
                };
            });
        } else {
            // Handle other form field changes
            setFormData((prev) => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const prepareFormDataForSubmission = (data = formData) => {
        // Create a new FormData instance
        const formDataToSubmit = new FormData();

        // Add basic fields
        formDataToSubmit.append('product_name', data.product_name);
        formDataToSubmit.append('product_description', data.product_description);
        formDataToSubmit.append('product_category', data.product_category);
        formDataToSubmit.append('is_draft', data.is_draft);
        formDataToSubmit.append('is_publish', data.is_publish);

        // Add thumbnail image
        if (data.product_thumb && data.product_thumb.file) {
            formDataToSubmit.append('product_thumb', data.product_thumb.file);
        }

        // Add product images
        if (data.product_images && data.product_images.length > 0) {
            data.product_images.forEach((image) => {
                if (image.file) {
                    formDataToSubmit.append('product_images', image.file);
                }
            });
        }

        // Add attributes as array
        if (Array.isArray(data.product_attributes)) {
            data.product_attributes.forEach((attr, index) => {
                if (attr && attr.key && attr.value) {
                    formDataToSubmit.append(`product_attributes[${index}][attr_name]`, attr.key);
                    formDataToSubmit.append(`product_attributes[${index}][attr_value]`, attr.value);
                }
            });
        }

        // Add variations as array
        if (Array.isArray(data.product_variations)) {
            data.product_variations.forEach((variation, index) => {
                formDataToSubmit.append(
                    `product_variations[${index}][variation_name]`,
                    variation.name
                );
                variation.options.forEach((option, optIndex) => {
                    formDataToSubmit.append(
                        `product_variations[${index}][variation_values][${optIndex}]`,
                        option
                    );
                });
            });
        }

        // Add SKU information
        if (data.sku_list && data.sku_list.length > 0) {
            // Check if it's a default SKU (created from product info)
            const isDefaultSku =
                data.sku_list.length === 1 &&
                data.sku_list[0].sku_tier_idx.length === 0 &&
                Object.keys(data.sku_list[0].selected_options).length === 0;

            // Only include SKU images if it's not a default SKU
            if (!isDefaultSku) {
                // Initialize sku_images_map
                const skuImagesMap = new Array(data.sku_list.length).fill(0);
                let hasSkuImages = false;

                // Add SKU thumbnails and images
                data.sku_list.forEach((sku, index) => {
                    if (sku.thumb && sku.thumb.file) {
                        formDataToSubmit.append('sku_thumb', sku.thumb.file);
                    }

                    if (sku.images && sku.images.length > 0) {
                        skuImagesMap[index] = sku.images.length;
                        hasSkuImages = true;
                    }
                });

                data.sku_list
                    .flatMap((sku) => sku.images)
                    .forEach((image) => {
                        formDataToSubmit.append('sku_images', image.file);
                    });

                // Handle SKU images map
                if (hasSkuImages) {
                    skuImagesMap.forEach((count, index) => {
                        formDataToSubmit.append(`sku_images_map[${index}]`, count);
                    });
                }
            }

            // Add SKU data
            data.sku_list.forEach((sku, index) => {
                // formDataToSubmit.append(`sku_list[${index}][sku_tier_idx]`, sku.sku_tier_idx);
                sku.sku_tier_idx.forEach((tierIdx, i) => {
                    formDataToSubmit.append(`sku_list[${index}][sku_tier_idx][${i}]`, tierIdx);
                });
                formDataToSubmit.append(`sku_list[${index}][sku_stock]`, sku.sku_stock);
                formDataToSubmit.append(`sku_list[${index}][sku_price]`, sku.sku_price);
                formDataToSubmit.append(`sku_list[${index}][warehouse]`, sku.warehouse); // Add warehouse to form submission
                // formDataToSubmit.append(`sku_list[${index}][]`, sku.);
            });
        }

        return formDataToSubmit;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);

            // Validate required fields
            if (
                !formData.product_name ||
                !formData.product_category ||
                !formData.product_description
            ) {
                alert('Please fill in all required fields');
                setLoading(false);
                return;
            }

            if (!formData.product_thumb) {
                alert('Thumbnail image is required');
                setLoading(false);
                return;
            }

            if (formData.product_images.length < 3) {
                alert('At least 3 additional product images are required');
                setLoading(false);
                return;
            }

            // Check if we have at least one valid SKU
            const hasValidSku = formData.sku_list.some(
                (sku) => sku.sku_price && sku.sku_stock >= 0 && sku.thumb
            );

            if (!hasValidSku) {
                alert(
                    'Please add at least one SKU with price, stock quantity, and thumbnail image'
                );
                setLoading(false);
                return;
            }

            // Prepare FormData for submission
            const formDataToSubmit = prepareFormDataForSubmission(formData);

            // Submit the form data to the API via HTTPS
            console.log('🔗 Creating product via HTTPS API:', API_URL);
            const response = await axiosClient.post(`${API_URL}/spu/create`, formDataToSubmit, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data && response.data.statusCode === 201) {
                console.log('✅ Product created successfully via HTTPS');
                alert('Product created successfully!');
                navigate('/products');
            }
        } catch (error) {
            console.error('Error submitting product:', error);
            alert('Failed to create product. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cx('new-product')}>
            <div className={cx('header')}>
                <h1>Create New Product</h1>
            </div>

            <form onSubmit={handleSubmit} className={cx('product-form')}>
                <div className={cx('form-layout')}>
                    <div className={cx('main-form')}>
                        <BasicInformation
                            formData={formData}
                            categories={categories}
                            handleInputChange={handleInputChange}
                        />

                        <ProductImages formData={formData} setFormData={setFormData} />

                        <PricingInventory
                            formData={formData}
                            handleInputChange={handleInputChange}
                            handleNumberChange={handleNumberChange}
                        />

                        <ProductVariations formData={formData} setFormData={setFormData} />

                        <ProductAttributes
                            formData={formData}
                            handleAttributeChange={handleAttributeChange}
                        />

                        <SKUManagement formData={formData} setFormData={setFormData} />
                    </div>
                </div>

                <div className={cx('footer-section')}>
                    <div className={cx('product-summary-container')}>
                        <ProductSummary formData={formData} />
                    </div>

                    <div className={cx('actions')}>
                        <button
                            type="button"
                            className={cx('draft-btn')}
                            onClick={() => {
                                setFormData((prev) => ({
                                    ...prev,
                                    is_draft: true,
                                    is_publish: false
                                }));
                                document.querySelector('form').requestSubmit();
                            }}
                            disabled={loading}
                        >
                            Save as Draft
                        </button>
                        <button
                            type="button"
                            className={cx('submit-btn')}
                            onClick={() => {
                                setFormData((prev) => ({
                                    ...prev,
                                    is_draft: false,
                                    is_publish: true
                                }));
                                document.querySelector('form').requestSubmit();
                            }}
                            disabled={loading}
                        >
                            {loading ? 'Publishing...' : 'Publish Product'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default NewProduct;
