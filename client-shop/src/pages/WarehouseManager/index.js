import React, { useState, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from './WarehouseManager.module.scss';
import AddWarehouseModal from './AddWarehouseModal';
import EditWarehouseModal from './EditWarehouseModal';
import { useToast } from '../../contexts/ToastContext';
import axiosClient from '../../configs/axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

function WarehouseManager() {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const { showToast } = useToast();
    const [deleteConfirm, setDeleteConfirm] = useState({
        show: false,
        warehouseId: null,
        warehouseName: '',
        nameInput: '',
        timer: 5,
        timerActive: false
    });

    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                setLoading(true);
                const response = await axiosClient.get('/warehouse');
                if (response.data && response.data.metadata) {
                    setWarehouses(response.data.metadata || []);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Lỗi khi tải thông tin kho');
                showToast(err.response?.data?.message || 'Lỗi khi tải thông tin kho', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchWarehouses();
    }, [showToast]);

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

    const handleAddWarehouse = async (newWarehouse) => {
        try {
            const response = await axiosClient.post('/warehouse/create', newWarehouse);
            if (response.data && response.data.metadata) {
                setWarehouses((prev) => [...prev, response.data.metadata]);
                showToast('Thêm kho hàng thành công!', 'success');
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Lỗi khi thêm kho hàng', 'error');
        }
    };

    const handleEditWarehouse = async (warehouseId, updatedData) => {
        try {
            const response = await axiosClient.patch(`/warehouse/${warehouseId}`, updatedData);
            if (response.data && response.data.metadata) {
                setWarehouses((prev) =>
                    prev.map((w) => (w._id === warehouseId ? response.data.metadata : w))
                );
                showToast('Cập nhật kho hàng thành công!', 'success');
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Lỗi khi cập nhật kho hàng', 'error');
            throw err;
        }
    };

    const openDeleteConfirm = (warehouse) => {
        setDeleteConfirm({
            show: true,
            warehouseId: warehouse._id,
            warehouseName: warehouse.name,
            nameInput: '',
            timer: 5,
            timerActive: true
        });
    };

    const closeDeleteConfirm = () => {
        setDeleteConfirm({
            show: false,
            warehouseId: null,
            warehouseName: '',
            nameInput: '',
            timer: 5,
            timerActive: false
        });
    };

    const handleDeleteWarehouse = async () => {
        try {
            await axiosClient.delete(`/warehouse/${deleteConfirm.warehouseId}`);
            setWarehouses(warehouses.filter((w) => w._id !== deleteConfirm.warehouseId));
            closeDeleteConfirm();
            showToast('Xóa kho hàng thành công', 'success');
        } catch (error) {
            console.error('Lỗi khi xóa kho hàng:', error);
            showToast('Không thể xóa kho hàng', 'error');
        }
    };

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    const openEditModal = (warehouse) => {
        setSelectedWarehouse(warehouse);
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setSelectedWarehouse(null);
        setIsEditModalOpen(false);
    };

    if (loading) {
        return <div className={cx('loading')}>Đang tải thông tin kho...</div>;
    }

    if (error) {
        return <div className={cx('error')}>{error}</div>;
    }

    return (
        <div className={cx('warehouse-manager')}>
            <div className={cx('header')}>
                <h1>Quản Lý Kho</h1>
                <button className={cx('add-warehouse-btn')} onClick={openModal}>
                    + Thêm Kho Mới
                </button>
            </div>

            {warehouses.length === 0 ? (
                <div className={cx('empty-state')}>
                    <div className={cx('empty-icon')}>🏭</div>
                    <p>Chưa có kho nào được thêm</p>
                    <p className={cx('empty-message')}>
                        Thêm kho để quản lý hàng hóa của bạn một cách hiệu quả
                    </p>
                    <button className={cx('add-warehouse-btn-empty')} onClick={openModal}>
                        + Thêm Kho Mới
                    </button>
                </div>
            ) : (
                <div className={cx('warehouses-grid')}>
                    {warehouses.map((warehouse) => (
                        <div key={warehouse._id} className={cx('warehouse-card')}>
                            <div className={cx('warehouse-header')}>
                                <h3>{warehouse.name}</h3>
                                <span className={cx('warehouse-status', warehouse.status)}>
                                    {warehouse.status === 'active' ? 'Hoạt Động' : warehouse.status}
                                </span>
                            </div>
                            <div className={cx('warehouse-info')}>
                                <div className={cx('info-item', 'address-item')}>
                                    <span className={cx('label')}>Địa chỉ:</span>
                                    <span>{warehouse.address?.text}</span>
                                </div>
                                <div className={cx('info-item')}>
                                    <span className={cx('label')}>Điện thoại:</span>
                                    <span>{warehouse.phoneNumber}</span>
                                </div>
                                <div className={cx('info-item')}>
                                    <span className={cx('label')}>Sản phẩm:</span>
                                    <span>{warehouse.stock || 0}</span>
                                </div>
                            </div>
                            <div className={cx('warehouse-actions')}>
                                <button
                                    className={cx('edit-btn')}
                                    onClick={() => openEditModal(warehouse)}
                                >
                                    Chỉnh Sửa
                                </button>
                                <button
                                    className={cx('delete-icon')}
                                    onClick={() => openDeleteConfirm(warehouse)}
                                    title="Xóa kho"
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {deleteConfirm.show && (
                <div className={cx('delete-dialog-overlay')}>
                    <div className={cx('delete-dialog')}>
                        <h3>Xác nhận xóa kho hàng</h3>
                        <p>
                            Bạn có chắc chắn muốn xóa kho hàng này? Hành động này không thể hoàn
                            tác.
                        </p>
                        <p>
                            Nhập tên kho hàng để xác nhận:{' '}
                            <strong>{deleteConfirm.warehouseName}</strong>
                        </p>
                        <input
                            type="text"
                            value={deleteConfirm.nameInput}
                            onChange={(e) =>
                                setDeleteConfirm((prev) => ({ ...prev, nameInput: e.target.value }))
                            }
                            placeholder="Nhập tên kho hàng"
                            className={cx('confirm-input')}
                        />
                        <div className={cx('dialog-actions')}>
                            <button className={cx('cancel-btn')} onClick={closeDeleteConfirm}>
                                Hủy
                            </button>
                            <button
                                className={cx('delete-btn')}
                                disabled={
                                    deleteConfirm.nameInput !== deleteConfirm.warehouseName ||
                                    deleteConfirm.timer > 0
                                }
                                onClick={handleDeleteWarehouse}
                            >
                                {deleteConfirm.timer > 0
                                    ? `Xóa (${deleteConfirm.timer}s)`
                                    : 'Xóa kho hàng'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AddWarehouseModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onAddWarehouse={handleAddWarehouse}
            />

            <EditWarehouseModal
                isOpen={isEditModalOpen}
                onClose={closeEditModal}
                onEditWarehouse={handleEditWarehouse}
                warehouse={selectedWarehouse}
            />
        </div>
    );
}

export default WarehouseManager;
