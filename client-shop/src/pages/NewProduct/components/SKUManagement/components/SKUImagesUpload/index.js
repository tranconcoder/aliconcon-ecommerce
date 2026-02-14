import React from 'react';
import classNames from 'classnames/bind';
import styles from './SKUImagesUpload.module.scss';

const cx = classNames.bind(styles);

function SKUImagesUpload({
    sku,
    skuIndex,
    MAX_IMAGES_PER_SKU,
    imagesInputRef,
    draggingImagesIndex,
    processingFileIndex,
    tempImagePreviews,
    onOpenPreview,
    onRemoveImage,
    handleSKUImagesChange,
    handleImagesBoxClick,
    handleImagesDragEnter,
    handleImagesDragLeave,
    handleImagesDragOver,
    handleImagesDrop
}) {
    return (
        <div className={cx('sku-images-section')}>
            <h3>
                Additional Images{' '}
                <span className={cx('image-limit-text')}>
                    (Max: {MAX_IMAGES_PER_SKU})
                </span>
            </h3>
            <div className={cx('sku-images-upload')}>
                <div className={cx('sku-images-grid')}>
                    {sku.images &&
                        sku.images.map((image, imageIndex) => (
                            <div
                                key={imageIndex}
                                className={cx('sku-image-item')}
                                onClick={() => onOpenPreview(image, 'additional', skuIndex, imageIndex)}
                            >
                                <img src={image.preview} alt={`SKU variant ${imageIndex}`} />
                                <button
                                    type="button"
                                    className={cx('remove-image')}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent opening preview
                                        onRemoveImage(skuIndex, imageIndex);
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    {(sku.images?.length || 0) < MAX_IMAGES_PER_SKU && (
                        <div
                            className={cx('add-sku-image', {
                                dragging: draggingImagesIndex === skuIndex,
                                processing: processingFileIndex === skuIndex
                            })}
                            onDragEnter={handleImagesDragEnter}
                            onDragLeave={handleImagesDragLeave}
                            onDragOver={handleImagesDragOver}
                            onDrop={handleImagesDrop}
                            onClick={handleImagesBoxClick}
                        >
                            {tempImagePreviews[skuIndex] ? (
                                <div className={cx('temp-preview-container')}>
                                    <div className={cx('temp-images-grid')}>
                                        {tempImagePreviews[skuIndex].map(
                                            (url, idx) => (
                                                <img
                                                    key={idx}
                                                    src={url}
                                                    alt={`Preview ${idx}`}
                                                    className={cx('temp-preview-image')}
                                                />
                                            )
                                        )}
                                    </div>
                                    <div className={cx('processing-overlay')}>
                                        <span>Processing...</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <span>+</span>
                                    <div className={cx('drag-text')}>
                                        {processingFileIndex === skuIndex
                                            ? 'Processing...'
                                            : 'Click or drag images here'}
                                    </div>
                                </>
                            )}
                            <input
                                type="file"
                                className={cx('file-input')}
                                accept="image/*"
                                multiple
                                onChange={handleSKUImagesChange}
                                ref={imagesInputRef}
                                style={{ display: 'none' }}
                            />
                        </div>
                    )}
                </div>
                {(sku.images?.length || 0) >= MAX_IMAGES_PER_SKU && (
                    <div className={cx('images-limit-reached')}>
                        Maximum number of images reached ({MAX_IMAGES_PER_SKU})
                    </div>
                )}
            </div>
        </div>
    );
}

export default SKUImagesUpload;
