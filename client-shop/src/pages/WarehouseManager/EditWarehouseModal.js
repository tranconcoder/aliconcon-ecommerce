import React, { useState, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from './WarehouseManager.module.scss';
import axiosClient from '../../configs/axios';

const cx = classNames.bind(styles);

function EditWarehouseModal({ isOpen, onClose, onEditWarehouse, warehouse }) {
    const [warehouseName, setWarehouseName] = useState('');
    const [warehousePhone, setWarehousePhone] = useState('');
    const [warehouseAddress, setWarehouseAddress] = useState({
        provinceId: '',
        districtId: '',
        wardId: '',
        address: '',
        coordinates: {
            lat: null,
            lng: null
        }
    });

    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load warehouse data when modal opens
    useEffect(() => {
        if (warehouse) {
            setWarehouseName(warehouse.name || '');
            setWarehousePhone(warehouse.phoneNumber || '');
            setWarehouseAddress({
                provinceId: warehouse.address?.provinceId || '',
                districtId: warehouse.address?.districtId || '',
                wardId: warehouse.address?.wardId || '',
                address: warehouse.address?.address || '',
                coordinates: {
                    lat: warehouse.address?.coordinates?.y || null,
                    lng: warehouse.address?.coordinates?.x || null
                }
            });
        }
    }, [warehouse]);

    useEffect(() => {
        const fetchProvinces = async () => {
            try {
                const response = await axiosClient.get('/location/province');
                if (response.data && response.data.metadata) {
                    setProvinces(response.data.metadata);
                }
            } catch (err) {
                console.error('Lỗi khi lấy danh sách tỉnh/thành phố:', err);
            }
        };

        fetchProvinces();
    }, []);

    useEffect(() => {
        if (!warehouseAddress.provinceId) {
            setDistricts([]);
            return;
        }

        const fetchDistricts = async () => {
            try {
                const response = await axiosClient.get(
                    `/location/district/province/${warehouseAddress.provinceId}`
                );
                if (response.data && response.data.metadata) {
                    setDistricts(response.data.metadata);
                }
            } catch (err) {
                console.error('Lỗi khi lấy danh sách quận/huyện:', err);
            }
        };

        fetchDistricts();
    }, [warehouseAddress.provinceId]);

    useEffect(() => {
        if (!warehouseAddress.districtId) {
            setWards([]);
            return;
        }

        const fetchWards = async () => {
            try {
                const response = await axiosClient.get(
                    `/location/ward/district/${warehouseAddress.districtId}`
                );
                if (response.data && response.data.metadata) {
                    setWards(response.data.metadata);
                }
            } catch (err) {
                console.error('Lỗi khi lấy danh sách phường/xã:', err);
            }
        };

        fetchWards();
    }, [warehouseAddress.districtId]);

    const handleAddressChange = (field) => (e) => {
        const { value } = e.target;

        if (field === 'provinceId') {
            setWarehouseAddress({
                ...warehouseAddress,
                provinceId: value,
                districtId: '',
                wardId: ''
            });
        } else if (field === 'districtId') {
            setWarehouseAddress({
                ...warehouseAddress,
                districtId: value,
                wardId: ''
            });
        } else {
            setWarehouseAddress({
                ...warehouseAddress,
                [field]: value
            });
        }

        if (errors[field]) {
            setErrors({
                ...errors,
                [field]: ''
            });
        }
    };



    const handleKeepCurrentLocation = () => {
        setWarehouseAddress({
            provinceId: '',
            districtId: '',
            wardId: '',
            address: '',
            coordinates: {
                lat: null,
                lng: null
            }
        });
        // Clear location-related errors
        const newErrors = { ...errors };
        delete newErrors.provinceId;
        delete newErrors.districtId;
        delete newErrors.address;
        setErrors(newErrors);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Enhanced console logging for development
        const isDev = process.env.NODE_ENV === 'development';

        if (isDev) {
            console.group('🏭 [DEV] WAREHOUSE UPDATE SUBMISSION');
            console.log('🆔 Warehouse ID:', warehouse._id);
            console.log('📋 Basic Info:');
            console.table({
                'Tên kho (cũ)': warehouse.name,
                'Tên kho (mới)': warehouseName,
                'Số điện thoại (cũ)': warehouse.phoneNumber,
                'Số điện thoại (mới)': warehousePhone,
                'Địa chỉ chi tiết (mới)': warehouseAddress.address
            });

            console.log('🗺️ Location Info:');
            console.table({
                'Province ID': warehouseAddress.provinceId,
                'District ID': warehouseAddress.districtId,
                'Ward ID': warehouseAddress.wardId || 'Không có'
            });

            console.log('📍 Coordinates:');
            if (warehouseAddress.coordinates.lat && warehouseAddress.coordinates.lng) {
                console.table({
                    'Latitude (cũ)': warehouse.address?.coordinates?.y || 'Không có',
                    'Longitude (cũ)': warehouse.address?.coordinates?.x || 'Không có',
                    'Latitude (mới)': warehouseAddress.coordinates.lat,
                    'Longitude (mới)': warehouseAddress.coordinates.lng,
                    'Google Maps Link': `https://maps.google.com/maps?q=${warehouseAddress.coordinates.lat},${warehouseAddress.coordinates.lng}`,
                    'Coordinates String': `${warehouseAddress.coordinates.lat.toFixed(
                        6
                    )}, ${warehouseAddress.coordinates.lng.toFixed(6)}`
                });
                console.log(
                    '🔗 Open in Google Maps:',
                    `https://maps.google.com/maps?q=${warehouseAddress.coordinates.lat},${warehouseAddress.coordinates.lng}`
                );
            } else {
                console.warn('⚠️ No coordinates provided');
            }

            console.log('📦 Payload to API:');
            const isUpdatingLocationForLog =
                warehouseAddress.provinceId ||
                warehouseAddress.districtId ||
                warehouseAddress.address.trim();
            const payloadForLog = {
                name: warehouseName,
                phoneNumber: warehousePhone,
                ...(isUpdatingLocationForLog && {
                    location: {
                        provinceId: warehouseAddress.provinceId,
                        districtId: warehouseAddress.districtId,
                        ...(warehouseAddress.wardId && { wardId: warehouseAddress.wardId }),
                        address: warehouseAddress.address,
                        ...(warehouseAddress.coordinates.lat && warehouseAddress.coordinates.lng
                            ? {
                                  coordinates: {
                                      x: warehouseAddress.coordinates.lng,
                                      y: warehouseAddress.coordinates.lat
                                  }
                              }
                            : {})
                    }
                })
            };
            console.dir(payloadForLog, { depth: null });
            console.groupEnd();
        }

        const validationErrors = {};
        if (!warehouseName.trim()) {
            validationErrors.name = 'Vui lòng nhập tên kho hàng';
        }
        if (!warehousePhone.trim()) {
            validationErrors.phoneNumber = 'Vui lòng nhập số điện thoại kho hàng';
        } else if (!/^\+?[0-9]{10,15}$/.test(warehousePhone)) {
            validationErrors.phoneNumber = 'Số điện thoại không hợp lệ';
        }

        // Location validation: only validate if user is trying to update location
        const isUpdatingLocation =
            warehouseAddress.provinceId ||
            warehouseAddress.districtId ||
            warehouseAddress.address.trim();

        if (isUpdatingLocation) {
            // If user is updating location, then all required fields must be filled
            if (!warehouseAddress.provinceId) {
                validationErrors.provinceId = 'Vui lòng chọn tỉnh/thành phố';
            }
            if (!warehouseAddress.districtId) {
                validationErrors.districtId = 'Vui lòng chọn quận/huyện';
            }
            if (!warehouseAddress.address.trim()) {
                validationErrors.address = 'Vui lòng nhập địa chỉ chi tiết';
            }
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            const updatedWarehouse = {
                name: warehouseName,
                phoneNumber: warehousePhone
            };

            // Only include location if user is updating it
            const isUpdatingLocation =
                warehouseAddress.provinceId ||
                warehouseAddress.districtId ||
                warehouseAddress.address.trim();

            if (isUpdatingLocation) {
                updatedWarehouse.location = {
                    provinceId: warehouseAddress.provinceId,
                    districtId: warehouseAddress.districtId,
                    ...(warehouseAddress.wardId && { wardId: warehouseAddress.wardId }),
                    address: warehouseAddress.address,
                    // Include coordinates if they exist (server expects x=lng, y=lat)
                    ...(warehouseAddress.coordinates.lat && warehouseAddress.coordinates.lng
                        ? {
                              coordinates: {
                                  x: warehouseAddress.coordinates.lng, // longitude
                                  y: warehouseAddress.coordinates.lat // latitude
                              }
                          }
                        : {})
                };
            }

            await onEditWarehouse(warehouse._id, updatedWarehouse);
            handleClose();
        } catch (error) {
            console.error('Error updating warehouse:', error);
            setErrors({
                form: 'Đã xảy ra lỗi khi cập nhật kho hàng. Vui lòng thử lại.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={cx('modal-overlay')}>
            <div className={cx('modal-container')}>
                <div className={cx('modal-header')}>
                    <h2>Chỉnh Sửa Kho Hàng</h2>
                    <button className={cx('close-button')} onClick={handleClose}>
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={cx('modal-form')}>
                    {errors.form && <div className={cx('error-message')}>{errors.form}</div>}

                    <div className={cx('form-group')}>
                        <label htmlFor="warehouse-name">Tên Kho Hàng *</label>
                        <input
                            type="text"
                            id="warehouse-name"
                            value={warehouseName}
                            onChange={(e) => setWarehouseName(e.target.value)}
                            placeholder="Kho chính, Kho phụ, v.v."
                            className={errors.name ? cx('has-error') : ''}
                        />
                        {errors.name && <div className={cx('error-text')}>{errors.name}</div>}
                    </div>

                    <div className={cx('form-group')}>
                        <label htmlFor="warehouse-phone">Số Điện Thoại Kho Hàng *</label>
                        <input
                            type="tel"
                            id="warehouse-phone"
                            value={warehousePhone}
                            onChange={(e) => setWarehousePhone(e.target.value)}
                            placeholder="Nhập số điện thoại kho hàng"
                            className={errors.phoneNumber ? cx('has-error') : ''}
                        />
                        {errors.phoneNumber && (
                            <div className={cx('error-text')}>{errors.phoneNumber}</div>
                        )}
                    </div>

                    <div className={cx('form-group')}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '8px'
                            }}
                        >
                            <label htmlFor="warehouse-province">Địa chỉ kho hàng</label>
                            <button
                                type="button"
                                onClick={handleKeepCurrentLocation}
                                style={{
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    backgroundColor: '#f0f0f0',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Giữ nguyên địa chỉ hiện tại
                            </button>
                        </div>
                        <label htmlFor="warehouse-province">
                            Tỉnh/Thành Phố {warehouseAddress.provinceId && '*'}
                        </label>
                        <select
                            id="warehouse-province"
                            value={warehouseAddress.provinceId}
                            onChange={handleAddressChange('provinceId')}
                            className={errors.provinceId ? cx('has-error') : ''}
                        >
                            <option value="">Chọn Tỉnh/Thành Phố</option>
                            {provinces.map((province) => (
                                <option key={province._id} value={province._id}>
                                    {province.province_name}
                                </option>
                            ))}
                        </select>
                        {errors.provinceId && (
                            <div className={cx('error-text')}>{errors.provinceId}</div>
                        )}
                    </div>

                    <div className={cx('form-group')}>
                        <label htmlFor="warehouse-district">
                            Quận/Huyện {warehouseAddress.provinceId && '*'}
                        </label>
                        <select
                            id="warehouse-district"
                            value={warehouseAddress.districtId}
                            onChange={handleAddressChange('districtId')}
                            disabled={!warehouseAddress.provinceId}
                            className={errors.districtId ? cx('has-error') : ''}
                        >
                            <option value="">Chọn Quận/Huyện</option>
                            {districts.map((district) => (
                                <option key={district._id} value={district._id}>
                                    {district.district_name}
                                </option>
                            ))}
                        </select>
                        {errors.districtId && (
                            <div className={cx('error-text')}>{errors.districtId}</div>
                        )}
                    </div>

                    <div className={cx('form-group')}>
                        <label htmlFor="warehouse-ward">Phường/Xã</label>
                        <select
                            id="warehouse-ward"
                            value={warehouseAddress.wardId}
                            onChange={handleAddressChange('wardId')}
                            disabled={!warehouseAddress.districtId}
                        >
                            <option value="">Chọn Phường/Xã</option>
                            {wards.map((ward) => (
                                <option key={ward._id} value={ward._id}>
                                    {ward.ward_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={cx('form-group')}>
                        <label htmlFor="warehouse-address">
                            Địa Chỉ Chi Tiết {warehouseAddress.provinceId && '*'}
                        </label>
                        <input
                            type="text"
                            id="warehouse-address"
                            value={warehouseAddress.address}
                            onChange={handleAddressChange('address')}
                            placeholder="Đường, Số nhà, v.v."
                            className={errors.address ? cx('has-error') : ''}
                        />
                        {errors.address && <div className={cx('error-text')}>{errors.address}</div>}
                    </div>

                    <div className={cx('modal-footer')}>
                        <button
                            type="button"
                            className={cx('cancel-btn')}
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Hủy
                        </button>
                        <button type="submit" className={cx('submit-btn')} disabled={isSubmitting}>
                            {isSubmitting ? 'Đang Lưu...' : 'Cập Nhật Kho Hàng'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditWarehouseModal;
