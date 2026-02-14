import React, { useState, useRef } from 'react';
import classNames from 'classnames/bind';
import styles from './ProductImages.module.scss';
import { FaUpload, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import ImagePreviewModal from '../../../../components/ImagePreviewModal';

const cx = classNames.bind(styles);

function ProductImages({ formData, setFormData }) {
    const [errors, setErrors] = useState({
        thumbnail: '',
        additionalImages: ''
    });

    // Add state for modal control
    const [previewImage, setPreviewImage] = useState(null);
    const [previewType, setPreviewType] = useState(null); // 'thumbnail' or 'additional'
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);

    // Add states for drag-and-drop
    const [isDraggingThumb, setIsDraggingThumb] = useState(false);
    const [isDraggingImages, setIsDraggingImages] = useState(false);

    // Add error state for URL drops
    const [dragError, setDragError] = useState('');

    // Add refs for the file inputs
    const thumbInputRef = useRef(null);
    const imagesInputRef = useRef(null);

    // Thêm state để theo dõi trạng thái đang xử lý upload
    const [isUploading, setIsUploading] = useState(false);

    // Handle opening the preview modal
    const handleOpenPreview = (image, type, index = null) => {
        setPreviewImage(image);
        setPreviewType(type);
        setSelectedImageIndex(index);
    };

    // Handle closing the preview modal
    const handleClosePreview = () => {
        setPreviewImage(null);
        setPreviewType(null);
        setSelectedImageIndex(null);
    };

    // Handle replacing an image from the modal
    const handleReplaceImage = (file) => {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setDragError('Only image files are allowed.');
            setTimeout(() => setDragError(''), 5000);
            return;
        }

        const reader = new FileReader();

        if (previewType === 'thumbnail') {
            reader.onload = () => {
                const newThumb = {
                    file,
                    preview: reader.result,
                    name: file.name
                };
                setFormData((prev) => ({
                    ...prev,
                    product_thumb: newThumb
                }));
                validateThumbnail(newThumb);
            };
        } else if (previewType === 'additional' && selectedImageIndex !== null) {
            reader.onload = () => {
                const newImage = {
                    file,
                    preview: reader.result,
                    name: file.name
                };

                setFormData((prev) => {
                    const updatedImages = [...prev.product_images];
                    updatedImages[selectedImageIndex] = newImage;
                    return {
                        ...prev,
                        product_images: updatedImages
                    };
                });
            };
        }

        reader.readAsDataURL(file);
    };

    const validateThumbnail = (thumb) => {
        if (!thumb) {
            setErrors((prev) => ({ ...prev, thumbnail: 'Thumbnail image is required' }));
            return false;
        }
        setErrors((prev) => ({ ...prev, thumbnail: '' }));
        return true;
    };

    const validateAdditionalImages = (images) => {
        if (!images || images.length < 3) {
            setErrors((prev) => ({
                ...prev,
                additionalImages: 'At least 3 additional images are required'
            }));
            return false;
        }
        setErrors((prev) => ({ ...prev, additionalImages: '' }));
        return true;
    };

    const validateFile = (file) => {
        // Kiểm tra có phải là file hay không
        if (!file || !(file instanceof File)) {
            setDragError('Không tìm thấy file hợp lệ. Vui lòng chọn file hình ảnh.');
            setTimeout(() => setDragError(''), 5000);
            return false;
        }

        // Kiểm tra file có phải là hình ảnh không
        if (!file.type.startsWith('image/')) {
            setDragError('Chỉ cho phép tải lên file hình ảnh (jpg, png, jpeg, gif).');
            setTimeout(() => setDragError(''), 5000);
            return false;
        }

        // Kiểm tra kích thước file (tối đa 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setDragError('Kích thước file không được vượt quá 5MB.');
            setTimeout(() => setDragError(''), 5000);
            return false;
        }

        return true;
    };

    const handleThumbUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Đánh dấu đang xử lý upload
        setIsUploading(true);

        if (validateFile(file)) {
            processThumbFile(file);
        }

        // Đặt lại trạng thái upload sau khi xử lý và clear giá trị input
        setTimeout(() => {
            setIsUploading(false);
            // Đảm bảo reset giá trị input
            if (thumbInputRef.current) {
                thumbInputRef.current.value = '';
            }
        }, 300);
    };

    const processThumbFile = (file) => {
        const reader = new FileReader();
        reader.onload = () => {
            const newThumb = {
                file,
                preview: reader.result,
                name: file.name
            };
            setFormData((prev) => ({
                ...prev,
                product_thumb: newThumb
            }));
            validateThumbnail(newThumb);
        };
        reader.readAsDataURL(file);
    };

    const handleImagesUpload = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        // Đánh dấu đang xử lý upload
        setIsUploading(true);

        const validFiles = files.filter((file) => validateFile(file));
        if (validFiles.length > 0) {
            processImageFiles(validFiles);
        }

        // Đặt lại trạng thái upload sau khi xử lý và clear giá trị input
        setTimeout(() => {
            setIsUploading(false);
            // Đảm bảo reset giá trị input
            if (imagesInputRef.current) {
                imagesInputRef.current.value = '';
            }
        }, 300);
    };

    const processImageFiles = (files) => {
        const newImages = files.map((file) => {
            const reader = new FileReader();
            return new Promise((resolve) => {
                reader.onload = () => {
                    resolve({
                        file,
                        preview: reader.result,
                        name: file.name
                    });
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(newImages).then((images) => {
            const updatedImages = [...formData.product_images, ...images];
            setFormData((prev) => ({
                ...prev,
                product_images: updatedImages
            }));
            validateAdditionalImages(updatedImages);
        });
    };

    // Drag and drop handlers for thumbnail
    const handleThumbDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingThumb(true);
        // Clear any previous error
        setDragError('');
    };

    const handleThumbDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingThumb(false);
    };

    const handleThumbDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleThumbDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingThumb(false);

        // Kiểm tra liệu browser có hỗ trợ dataTransfer.items hay không
        if (!e.dataTransfer.items && !e.dataTransfer.files) {
            setDragError('Trình duyệt của bạn không hỗ trợ tính năng kéo thả file.');
            setTimeout(() => setDragError(''), 5000);
            return;
        }

        // Kiểm tra xem có phải đang kéo thả file hay không
        const isFileDrop = Array.from(e.dataTransfer.types).some(
            (type) => type.toLowerCase() === 'files'
        );

        if (isFileDrop && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file && validateFile(file)) {
                processThumbFile(file);
            } else if (!file) {
                setDragError('Không tìm thấy file. Vui lòng chọn một file hình ảnh.');
                setTimeout(() => setDragError(''), 5000);
            }
        } else {
            setDragError(
                'Vui lòng chọn một file hình ảnh để tải lên. Không thể sử dụng URL hoặc văn bản.'
            );
            setTimeout(() => setDragError(''), 5000);
        }
    };

    // Drag and drop handlers for additional images
    const handleImagesDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingImages(true);
        // Clear any previous error
        setDragError('');
    };

    const handleImagesDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingImages(false);
    };

    const handleImagesDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleImagesDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingImages(false);

        // Kiểm tra liệu browser có hỗ trợ dataTransfer.items hay không
        if (!e.dataTransfer.items && !e.dataTransfer.files) {
            setDragError('Trình duyệt của bạn không hỗ trợ tính năng kéo thả file.');
            setTimeout(() => setDragError(''), 5000);
            return;
        }

        // Kiểm tra xem có phải đang kéo thả file hay không
        const isFileDrop = Array.from(e.dataTransfer.types).some(
            (type) => type.toLowerCase() === 'files'
        );

        if (isFileDrop && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            const validFiles = files.filter((file) => validateFile(file));

            if (validFiles.length > 0) {
                processImageFiles(validFiles);
            } else if (files.length > 0 && validFiles.length === 0) {
                setDragError(
                    'Các file được chọn không hợp lệ. Vui lòng chỉ chọn file hình ảnh (jpg, png, jpeg).'
                );
                setTimeout(() => setDragError(''), 5000);
            }
        } else {
            setDragError(
                'Vui lòng chọn file hình ảnh để tải lên. Không thể sử dụng URL hoặc văn bản.'
            );
            setTimeout(() => setDragError(''), 5000);
        }
    };

    const removeImage = (indexToRemove) => {
        const updatedImages = formData.product_images.filter((_, index) => index !== indexToRemove);
        setFormData((prev) => ({
            ...prev,
            product_images: updatedImages
        }));
        validateAdditionalImages(updatedImages);
    };

    const removeThumbnail = () => {
        setFormData((prev) => ({ ...prev, product_thumb: null }));
        validateThumbnail(null);
    };

    // Hàm xử lý click để mở hộp thoại chọn file
    const handleThumbBoxClick = (e) => {
        // Ngăn chặn việc mở hộp thoại chọn file nhiều lần
        if (isUploading) return;

        if (thumbInputRef.current) {
            thumbInputRef.current.value = ''; // Clear giá trị input
            thumbInputRef.current.click();
        }
    };

    // Hàm xử lý click để mở hộp thoại chọn nhiều file
    const handleImagesBoxClick = (e) => {
        // Ngăn chặn việc mở hộp thoại chọn file nhiều lần
        if (isUploading) return;

        if (imagesInputRef.current) {
            imagesInputRef.current.value = ''; // Clear giá trị input
            imagesInputRef.current.click();
        }
    };

    return (
        <div className={cx('form-section')}>
            <h2>Product Images</h2>

            {/* Hiển thị thông báo lỗi nếu có */}
            {dragError && (
                <div className={cx('error-message', 'drag-error')}>
                    <FaExclamationTriangle /> {dragError}
                </div>
            )}

            {/* Thumbnail Section */}
            <div className={cx('form-group')}>
                <label>
                    Thumbnail <span className={cx('required-mark')}>*</span>
                </label>
                <div
                    className={cx('upload-box', {
                        'error-border': errors.thumbnail || dragError,
                        dragging: isDraggingThumb,
                        uploading: isUploading
                    })}
                    onDragEnter={handleThumbDragEnter}
                    onDragLeave={handleThumbDragLeave}
                    onDragOver={handleThumbDragOver}
                    onDrop={handleThumbDrop}
                    onClick={handleThumbBoxClick}
                >
                    <input
                        ref={thumbInputRef}
                        type="file"
                        className={cx('file-input')}
                        onChange={handleThumbUpload}
                        accept="image/*"
                        style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
                    />
                    <div className={cx('upload-placeholder')}>
                        <FaUpload className={cx('upload-icon')} />
                        <span>
                            {isUploading ? 'Processing...' : 'Upload Thumbnail or Drag & Drop'}
                        </span>
                    </div>
                </div>

                {errors.thumbnail && (
                    <div className={cx('error-message')}>
                        <FaExclamationTriangle /> {errors.thumbnail}
                    </div>
                )}

                {formData.product_thumb && (
                    <div
                        className={cx('image-preview', 'thumbnail-preview')}
                        onClick={() => handleOpenPreview(formData.product_thumb, 'thumbnail')}
                    >
                        <img src={formData.product_thumb.preview} alt="Thumbnail Preview" />
                        <button
                            type="button"
                            className={cx('remove-image')}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent opening preview when clicking remove
                                removeThumbnail();
                            }}
                        >
                            <FaTimes />
                        </button>
                    </div>
                )}
            </div>

            {/* Additional Images Section */}
            <div className={cx('form-group')}>
                <label>
                    Additional Images <span className={cx('required-mark')}>*</span>
                    <small> (At least 3 images)</small>
                </label>
                <div
                    className={cx('upload-box', {
                        'error-border': errors.additionalImages || dragError,
                        dragging: isDraggingImages,
                        uploading: isUploading
                    })}
                    onDragEnter={handleImagesDragEnter}
                    onDragLeave={handleImagesDragLeave}
                    onDragOver={handleImagesDragOver}
                    onDrop={handleImagesDrop}
                    onClick={handleImagesBoxClick}
                >
                    <input
                        ref={imagesInputRef}
                        type="file"
                        className={cx('file-input')}
                        multiple
                        onChange={handleImagesUpload}
                        accept="image/*"
                        style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
                    />
                    <div className={cx('upload-placeholder')}>
                        <FaUpload className={cx('upload-icon')} />
                        <span>
                            {isUploading
                                ? 'Processing...'
                                : 'Upload Additional Images or Drag & Drop'}
                        </span>
                    </div>
                </div>

                {errors.additionalImages && (
                    <div className={cx('error-message')}>
                        <FaExclamationTriangle /> {errors.additionalImages}
                    </div>
                )}

                <div className={cx('additional-images-counter')}>
                    {formData.product_images.length} of 3 required images
                </div>

                <div className={cx('additional-images-container')}>
                    <div className={cx('additional-images-grid')}>
                        {formData.product_images.map((image, index) => (
                            <div
                                key={index}
                                className={cx('additional-image-preview')}
                                onClick={() => handleOpenPreview(image, 'additional', index)}
                            >
                                <img src={image.preview} alt={`Product ${index + 1}`} />
                                <button
                                    type="button"
                                    className={cx('remove-image')}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent opening preview when clicking remove
                                        removeImage(index);
                                    }}
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

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

export default ProductImages;
