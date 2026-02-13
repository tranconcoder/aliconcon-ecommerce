import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectShopInfo } from '../../../../store/slices/shopSlice';
import { fetchWarehouses } from '../../../../store/slices/warehouseSlice';
import classNames from 'classnames/bind';
import styles from './SKUManagement.module.scss';
import ImagePreviewModal from '../../../../components/ImagePreviewModal';
import SKUItem from './components/SKUItem';

const cx = classNames.bind(styles);

function SKUManagement({ formData, setFormData }) {
    const dispatch = useDispatch();
    const shopInfo = useSelector(selectShopInfo);
    const { warehouses, loading: warehousesLoading } = useSelector((state) => state.warehouses);

    const [duplicateError, setDuplicateError] = useState(null);
    const [currentSkuIndex, setCurrentSkuIndex] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [previewType, setPreviewType] = useState(null);
    const [selectedSkuIndex, setSelectedSkuIndex] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [processingFileIndex, setProcessingFileIndex] = useState(null);
    const [tempThumbPreviews, setTempThumbPreviews] = useState({});
    const [tempImagePreviews, setTempImagePreviews] = useState({});
    const [warehouseErrors, setWarehouseErrors] = useState({});

    // Maximum number of images per SKU
    const MAX_IMAGES_PER_SKU = 5;

    // Fetch warehouses when component mounts
    useEffect(() => {
        if (shopInfo?.shop_id) {
            dispatch(fetchWarehouses(shopInfo.shop_id));
        }
    }, [dispatch, shopInfo]);

    // Check if there are valid variations
    const hasValidVariations = formData.product_variations?.some(
        (v) =>
            v.name &&
            v.options &&
            v.options.length > 0 &&
            v.options.some((opt) => opt.trim() !== '')
    );

    // Check if there is any valid SKU
    const hasValidSku = formData.sku_list.some(
        (sku) => sku.sku_price && sku.sku_stock >= 0 && sku.thumb
    );

    // Handle opening the preview modal
    const handleOpenPreview = (image, type, skuIndex, imageIndex = null) => {
        setPreviewImage(image);
        setPreviewType(type);
        setSelectedSkuIndex(skuIndex);
        setSelectedImageIndex(imageIndex);
    };

    // Handle closing the preview modal
    const handleClosePreview = () => {
        setPreviewImage(null);
        setPreviewType(null);
        setSelectedSkuIndex(null);
        setSelectedImageIndex(null);
    };

    // Handle replacing an image from the modal
    const handleReplaceImage = (file) => {
        if (!file || selectedSkuIndex === null) return;

        const reader = new FileReader();

        if (previewType === 'thumb') {
            reader.onload = () => {
                // ...existing code...
            };
        } else if (previewType === 'additional' && selectedImageIndex !== null) {
            reader.onload = () => {
                // ...existing code...
            };
        }

        reader.readAsDataURL(file);
    };

    // Clear duplicate error when component re-renders with new formData
    useEffect(() => {
        setDuplicateError(null);
    }, [formData.product_variations]);

    // Update total product quantity whenever SKU quantities change
    useEffect(() => {
        if (formData.sku_list && formData.sku_list.length > 0) {
            const totalQuantity = formData.sku_list.reduce((sum, sku) => {
                return sum + (parseInt(sku.sku_stock) || 0);
            }, 0);

            setFormData((prev) => ({
                ...prev,
                product_quantity: totalQuantity
            }));
        }
    }, [formData.sku_list, setFormData]);

    // Clear SKUs when no valid variations
    useEffect(() => {
        if (!hasValidVariations && formData.sku_list.length > 0) {
            setFormData((prev) => ({
                ...prev,
                sku_list: []
            }));
        }
    }, [hasValidVariations, formData.sku_list.length, setFormData]);

    // Check if a variation combination already exists
    const checkDuplicateVariation = (skuIndex, selectedOptions) => {
        const optionsKey = JSON.stringify(
            Object.entries(selectedOptions)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => `${key}:${value}`)
        );

        // Check if this combination exists in another SKU
        const duplicateIndex = formData.sku_list.findIndex((sku, index) => {
            if (index === skuIndex) return false; // Skip current SKU

            const skuOptionsKey = JSON.stringify(
                Object.entries(sku.selected_options || {})
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([key, value]) => `${key}:${value}`)
            );

            return skuOptionsKey === optionsKey;
        });

        return duplicateIndex;
    };

    const addSKU = () => {
        const newSKU = {
            sku_tier_idx: [],
            selected_options: {}, // Store selected options for UI display
            thumb: null,
            images: [],
            sku_stock: 0,
            sku_price: '',
            warehouse: '' // Using warehouse instead of sku_warehouse
        };
        setFormData((prev) => ({
            ...prev,
            sku_list: [...prev.sku_list, newSKU]
        }));
        setDuplicateError(null);
        setCurrentSkuIndex(formData.sku_list.length);
    };

    const handleOptionSelect = (skuIndex, variationIndex, optionIndex) => {
        setCurrentSkuIndex(skuIndex);
        const newSKUs = [...formData.sku_list];

        // Update the selected options object for UI
        const newSelectedOptions = {
            ...newSKUs[skuIndex].selected_options,
            [variationIndex]: optionIndex
        };

        // Check for duplicates before updating
        const duplicateIndex = checkDuplicateVariation(skuIndex, newSelectedOptions);

        if (duplicateIndex !== -1) {
            setDuplicateError({
                message: `This variation combination already exists in SKU #${duplicateIndex + 1}`,
                skuIndex: duplicateIndex
            });
        } else {
            setDuplicateError(null);
            newSKUs[skuIndex].selected_options = newSelectedOptions;

            // Convert selected options to sku_tier_idx format
            const tierIdxArray = Object.entries(newSelectedOptions)
                .map(([varIdx, optIdx]) => ({
                    variationIndex: parseInt(varIdx),
                    optionIndex: parseInt(optIdx)
                }))
                .sort((a, b) => a.variationIndex - b.variationIndex)
                .map((item) => item.optionIndex);

            newSKUs[skuIndex].sku_tier_idx = tierIdxArray;

            setFormData((prev) => ({
                ...prev,
                sku_list: newSKUs
            }));
        }
    };

    const processSkuThumbFile = (skuIndex, file) => {
        if (!file) return;

        // Show immediate preview
        const objectUrl = URL.createObjectURL(file);
        setTempThumbPreviews((prev) => ({
            ...prev,
            [skuIndex]: objectUrl
        }));

        const reader = new FileReader();
        reader.onloadend = () => {
            const newSKUs = [...formData.sku_list];
            newSKUs[skuIndex].thumb = {
                file,
                preview: reader.result
            };
            setFormData((prev) => ({
                ...prev,
                sku_list: newSKUs
            }));

            // Cleanup processing state after completion
            setTimeout(() => {
                setProcessingFileIndex(null);
                setTempThumbPreviews((prev) => {
                    const newPreviews = { ...prev };
                    delete newPreviews[skuIndex];
                    return newPreviews;
                });
            }, 300);
        };
        reader.readAsDataURL(file);
    };

    const processSkuImageFiles = (skuIndex, files) => {
        if (files.length === 0) return;

        // Check if adding the new files would exceed the maximum
        const currentImageCount = formData.sku_list[skuIndex].images?.length || 0;
        const remainingSlots = MAX_IMAGES_PER_SKU - currentImageCount;

        if (remainingSlots <= 0) return;

        // Only add up to the remaining slots
        const filesToAdd = files.slice(0, remainingSlots);

        // Show immediate previews
        const objectUrls = filesToAdd.map((file) => URL.createObjectURL(file));
        setTempImagePreviews((prev) => ({
            ...prev,
            [skuIndex]: objectUrls
        }));

        const filePromises = filesToAdd.map((file) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve({
                        file,
                        preview: reader.result
                    });
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(filePromises).then((newImages) => {
            const newSKUs = [...formData.sku_list];
            newSKUs[skuIndex].images = [...(newSKUs[skuIndex].images || []), ...newImages];
            setFormData((prev) => ({
                ...prev,
                sku_list: newSKUs
            }));

            // Cleanup processing state after completion
            setTimeout(() => {
                setProcessingFileIndex(null);
                setTempImagePreviews((prev) => {
                    const newPreviews = { ...prev };
                    delete newPreviews[skuIndex];
                    return newPreviews;
                });
            }, 300);
        });
    };

    const updateSKU = (index, field, value) => {
        const newSKUs = [...formData.sku_list];
        newSKUs[index][field] = value;
        setFormData((prev) => ({
            ...prev,
            sku_list: newSKUs
        }));
    };

    const removeSKU = (skuIndex) => {
        setFormData((prev) => ({
            ...prev,
            sku_list: prev.sku_list.filter((_, index) => index !== skuIndex)
        }));
    };

    const removeSKUImage = (skuIndex, imageIndex) => {
        const newSKUs = [...formData.sku_list];
        newSKUs[skuIndex].images.splice(imageIndex, 1);
        setFormData((prev) => ({
            ...prev,
            sku_list: newSKUs
        }));
    };

    const handleSkuNumberChange = (skuIndex, field, value) => {
        const numValue = value === '' ? (field === 'sku_stock' ? 0 : '') : Number(value);

        const newSKUs = [...formData.sku_list];
        newSKUs[skuIndex][field] = numValue;

        setFormData((prev) => ({
            ...prev,
            sku_list: newSKUs
        }));
    };

    const handleWarehouseChange = (skuIndex, warehouseId) => {
        const newSKUs = [...formData.sku_list];
        newSKUs[skuIndex].warehouse = warehouseId;
        setFormData((prev) => ({
            ...prev,
            sku_list: newSKUs
        }));

        // Clear error when warehouse is selected
        if (warehouseId) {
            setWarehouseErrors((prev) => ({
                ...prev,
                [skuIndex]: null
            }));
        }
    };

    // Validate warehouses
    useEffect(() => {
        const newErrors = {};

        formData.sku_list.forEach((sku, index) => {
            if (!sku.warehouse) {
                newErrors[index] = 'Vui lòng chọn kho hàng';
            }
        });

        setWarehouseErrors(newErrors);
    }, [formData.sku_list]);

    // Clean up object URLs on component unmount
    useEffect(() => {
        return () => {
            // Cleanup temporary previews
            Object.values(tempThumbPreviews).forEach(URL.revokeObjectURL);
            Object.values(tempImagePreviews).forEach((urls) => urls.forEach(URL.revokeObjectURL));
        };
    }, [tempThumbPreviews, tempImagePreviews]);

    return (
        <div className={cx('form-section')}>
            <h2>SKU Management</h2>
            <p className={cx('section-description')}>
                Configure SKUs for your product variations and upload specific images for each
                combination.
            </p>

            {!hasValidVariations && (
                <div className={cx('sku-notice', 'error')}>
                    <p>
                        ⚠️ You must define at least one variation with options before adding SKUs.
                    </p>
                </div>
            )}

            {!hasValidSku && hasValidVariations && (
                <div className={cx('sku-warning')}>
                    <p>
                        ⚠️ At least one SKU with price, stock quantity, and thumbnail image is
                        required to create a product.
                    </p>
                </div>
            )}

            <div className={cx('sku-list')}>
                {formData.sku_list.map((sku, skuIndex) => (
                    <SKUItem
                        key={skuIndex}
                        sku={sku}
                        skuIndex={skuIndex}
                        formData={formData}
                        warehouses={warehouses}
                        warehousesLoading={warehousesLoading}
                        duplicateError={duplicateError}
                        currentSkuIndex={currentSkuIndex}
                        processingFileIndex={processingFileIndex}
                        tempThumbPreviews={tempThumbPreviews}
                        tempImagePreviews={tempImagePreviews}
                        warehouseErrors={warehouseErrors}
                        MAX_IMAGES_PER_SKU={MAX_IMAGES_PER_SKU}
                        hasVariations={hasValidVariations}
                        onRemoveSKU={removeSKU}
                        onOptionSelect={handleOptionSelect}
                        onProcessThumb={processSkuThumbFile}
                        onProcessImages={processSkuImageFiles}
                        onRemoveImage={removeSKUImage}
                        onWarehouseChange={handleWarehouseChange}
                        onSkuNumberChange={handleSkuNumberChange}
                        onUpdateSKU={updateSKU}
                        onOpenPreview={handleOpenPreview}
                        setProcessingFileIndex={setProcessingFileIndex}
                    />
                ))}
            </div>

            <button
                type="button"
                onClick={addSKU}
                className={cx('add-variation-btn')}
                disabled={!hasValidVariations}
            >
                <span className={cx('add-icon')}>+</span> Add New SKU
                {!hasValidVariations && (
                    <span className={cx('btn-tooltip')}>Define variations first</span>
                )}
            </button>

            {/* Image Preview Modal */}
            {previewImage && (
                <ImagePreviewModal
                    image={previewImage}
                    onClose={handleClosePreview}
                    onReplace={handleReplaceImage}
                />
            )}
        </div>
    );
}

export default SKUManagement;
