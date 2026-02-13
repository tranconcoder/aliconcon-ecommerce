import React, { useState, useEffect, useCallback } from 'react';
import classNames from 'classnames/bind';
import styles from './OrderManager.module.scss';
import OrderDetails from './components/OrderDetails';
import axiosClient from '../../configs/axios';
import { useToast } from '../../contexts/ToastContext';
// import orderService from '../../services/orderService'; // Temporarily disabled

const cx = classNames.bind(styles);

function OrderManager() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pending, processing, shipped, delivered, cancelled
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [processingOrderId, setProcessingOrderId] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [orderToReject, setOrderToReject] = useState(null);
    const { showToast } = useToast();

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            console.log('Attempting to fetch orders...');

            // Temporary direct API call to test
            const response = await axiosClient.get('/order/shop', {
                params: {
                    status: filter !== 'all' ? filter : undefined,
                    search: searchTerm || undefined,
                    page: 1,
                    limit: 50
                }
            });

            console.log('API response:', response);

            if (response.data && response.data.metadata && response.data.metadata.orders) {
                setOrders(response.data.metadata.orders);
            } else {
                setOrders([]);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            showToast('Lỗi khi tải danh sách đơn hàng', 'error');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [filter, searchTerm, showToast]);

    useEffect(() => {
        console.log('OrderManager mounted');
        fetchOrders();
    }, [fetchOrders]);

    // Refetch orders when filter or search changes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchOrders();
        }, 500); // Debounce search

        return () => clearTimeout(timeoutId);
    }, [fetchOrders]);

    // Format date to a more readable format
    const formatDate = (dateString) => {
        try {
            const options = {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            return new Date(dateString).toLocaleDateString('vi-VN', options);
        } catch (error) {
            return 'Invalid Date';
        }
    };

    // Format price to VND currency
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

    // Get Vietnamese status text
    const getStatusText = (status) => {
        const statusMap = {
            pending: 'Chờ xác nhận',
            pending_payment: 'Chờ thanh toán',
            delivering: 'Đang giao hàng',
            completed: 'Đã hoàn thành',
            cancelled: 'Đã hủy'
        };
        return statusMap[status] || status;
    };

    // Approve order
    const handleApproveOrder = async (orderId) => {
        try {
            setProcessingOrderId(orderId);
            // Temporary direct API call
            await axiosClient.patch(`/order/${orderId}/approve`);

            showToast('Đơn hàng đã được xác nhận thành công', 'success');
            fetchOrders(); // Refresh the orders list
        } catch (error) {
            console.error('Error approving order:', error);
            const errorMessage = error.response?.data?.message || 'Lỗi khi xác nhận đơn hàng';
            showToast(errorMessage, 'error');
        } finally {
            setProcessingOrderId(null);
        }
    };

    // Show reject modal
    const handleShowRejectModal = (order) => {
        setOrderToReject(order);
        setShowRejectModal(true);
        setRejectReason('');
    };

    // Hide reject modal
    const handleHideRejectModal = () => {
        setShowRejectModal(false);
        setOrderToReject(null);
        setRejectReason('');
    };

    // Reject order
    const handleRejectOrder = async () => {
        if (!orderToReject) return;

        try {
            setProcessingOrderId(orderToReject._id);
            // Temporary direct API call
            await axiosClient.patch(`/order/${orderToReject._id}/reject`, {
                reason: rejectReason || undefined
            });

            showToast('Đơn hàng đã được từ chối thành công', 'success');
            handleHideRejectModal();
            fetchOrders(); // Refresh the orders list
        } catch (error) {
            console.error('Error rejecting order:', error);
            const errorMessage = error.response?.data?.message || 'Lỗi khi từ chối đơn hàng';
            showToast(errorMessage, 'error');
        } finally {
            setProcessingOrderId(null);
        }
    };

    // Complete order (mark as delivered)
    const handleCompleteOrder = async (orderId) => {
        try {
            setProcessingOrderId(orderId);
            await axiosClient.patch(`/order/${orderId}/complete`);

            showToast('Đơn hàng đã được đánh dấu là đã giao thành công', 'success');
            fetchOrders(); // Refresh the orders list
        } catch (error) {
            console.error('Error completing order:', error);
            const errorMessage = error.response?.data?.message || 'Lỗi khi hoàn thành đơn hàng';
            showToast(errorMessage, 'error');
        } finally {
            setProcessingOrderId(null);
        }
    };

    // Update order status (for other status changes)
    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            setProcessingOrderId(orderId);

            // Use specific endpoints for different actions
            if (newStatus === 'completed') {
                await handleCompleteOrder(orderId);
                return; // Exit early since handleCompleteOrder already handles the UI updates
            } else {
                await axiosClient.patch(`/order/${orderId}/status`, { status: newStatus });
            }

            showToast(
                `Đã cập nhật trạng thái đơn hàng thành ${getStatusText(newStatus)}`,
                'success'
            );
            fetchOrders(); // Refresh the orders list
        } catch (error) {
            console.error('Error updating order status:', error);
            const errorMessage =
                error.response?.data?.message || 'Lỗi khi cập nhật trạng thái đơn hàng';
            showToast(errorMessage, 'error');
        } finally {
            setProcessingOrderId(null);
        }
    };

    // View order details
    const handleViewDetails = (order) => {
        setSelectedOrder(order);
        setShowDetails(true);
    };

    // Close order details modal
    const handleCloseDetails = () => {
        setShowDetails(false);
        setSelectedOrder(null);
    };

    // Filter orders based on status and search term
    const filteredOrders = orders.filter((order) => {
        const matchesFilter = filter === 'all' || order.order_status === filter;
        const matchesSearch =
            order._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer_full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer_phone?.includes(searchTerm);

        return matchesFilter && matchesSearch;
    });

    return (
        <div className={cx('order-manager')}>
            <div className={cx('header')}>
                <h1>Quản Lý Đơn Hàng</h1>
            </div>

            <div className={cx('filters')}>
                <div className={cx('status-filters')}>
                    <button
                        className={cx('filter-btn', filter === 'all' && 'active')}
                        onClick={() => setFilter('all')}
                    >
                        Tất Cả Đơn Hàng
                    </button>
                    <button
                        className={cx('filter-btn', filter === 'pending' && 'active')}
                        onClick={() => setFilter('pending')}
                    >
                        Chờ Xác Nhận
                    </button>
                    <button
                        className={cx('filter-btn', filter === 'delivering' && 'active')}
                        onClick={() => setFilter('delivering')}
                    >
                        Đang Giao Hàng
                    </button>
                    <button
                        className={cx('filter-btn', filter === 'completed' && 'active')}
                        onClick={() => setFilter('completed')}
                    >
                        Đã Hoàn Thành
                    </button>
                    <button
                        className={cx('filter-btn', filter === 'cancelled' && 'active')}
                        onClick={() => setFilter('cancelled')}
                    >
                        Đã Hủy
                    </button>
                </div>
                <div className={cx('search')}>
                    <input
                        type="text"
                        placeholder="Tìm kiếm đơn hàng..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className={cx('loading')}>Đang tải đơn hàng...</div>
            ) : (
                <>
                    {filteredOrders.length === 0 ? (
                        <div className={cx('no-orders')}>
                            Không tìm thấy đơn hàng nào.
                            {filter !== 'all' && (
                                <button
                                    onClick={() => setFilter('all')}
                                    className={cx('reset-btn')}
                                >
                                    Xóa bộ lọc
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className={cx('orders-table-wrapper')}>
                            <table className={cx('orders-table')}>
                                <thead>
                                    <tr>
                                        <th>Mã Đơn</th>
                                        <th>Khách Hàng</th>
                                        <th>Ngày Đặt</th>
                                        <th>Tổng Tiền</th>
                                        <th>Trạng Thái</th>
                                        <th>Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map((order) => (
                                        <tr key={order._id}>
                                            <td className={cx('order-id')}>{order._id}</td>
                                            <td className={cx('customer-info')}>
                                                <div className={cx('customer-name')}>
                                                    {order.customer_full_name}
                                                </div>
                                                <div className={cx('customer-contact')}>
                                                    {order.customer_phone}
                                                </div>
                                            </td>
                                            <td>{formatDate(order.created_at)}</td>
                                            <td className={cx('order-total')}>
                                                {formatPrice(order.price_to_payment)}
                                            </td>
                                            <td>
                                                <span className={cx('status', order.order_status)}>
                                                    {getStatusText(order.order_status)}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={cx('actions')}>
                                                    <button
                                                        className={cx('view-btn')}
                                                        onClick={() => handleViewDetails(order)}
                                                    >
                                                        Xem chi tiết
                                                    </button>

                                                    {order.order_status === 'pending' && (
                                                        <>
                                                            <button
                                                                className={cx('process-btn')}
                                                                onClick={() =>
                                                                    handleApproveOrder(order._id)
                                                                }
                                                                disabled={
                                                                    processingOrderId === order._id
                                                                }
                                                            >
                                                                {processingOrderId === order._id
                                                                    ? 'Đang xử lý...'
                                                                    : 'Xác nhận'}
                                                            </button>
                                                            <button
                                                                className={cx('cancel-btn')}
                                                                onClick={() =>
                                                                    handleShowRejectModal(order)
                                                                }
                                                                disabled={
                                                                    processingOrderId === order._id
                                                                }
                                                            >
                                                                Từ chối
                                                            </button>
                                                        </>
                                                    )}

                                                    {order.order_status === 'delivering' && (
                                                        <button
                                                            className={cx('deliver-btn')}
                                                            onClick={() =>
                                                                handleCompleteOrder(order._id)
                                                            }
                                                            disabled={
                                                                processingOrderId === order._id
                                                            }
                                                        >
                                                            {processingOrderId === order._id
                                                                ? 'Đang xử lý...'
                                                                : 'Đã giao'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Reject Order Modal */}
            {showRejectModal && (
                <div className={cx('modal-overlay')}>
                    <div className={cx('modal')}>
                        <div className={cx('modal-header')}>
                            <h3>Từ chối đơn hàng</h3>
                            <button className={cx('close-btn')} onClick={handleHideRejectModal}>
                                ×
                            </button>
                        </div>
                        <div className={cx('modal-body')}>
                            <p>
                                Bạn có chắc chắn muốn từ chối đơn hàng{' '}
                                <strong>{orderToReject?._id}</strong>?
                            </p>
                            <div className={cx('form-group')}>
                                <label htmlFor="rejectReason">Lý do từ chối (tùy chọn):</label>
                                <textarea
                                    id="rejectReason"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Nhập lý do từ chối đơn hàng..."
                                    rows={4}
                                />
                            </div>
                        </div>
                        <div className={cx('modal-footer')}>
                            <button
                                className={cx('cancel-modal-btn')}
                                onClick={handleHideRejectModal}
                                disabled={processingOrderId === orderToReject?._id}
                            >
                                Hủy
                            </button>
                            <button
                                className={cx('confirm-reject-btn')}
                                onClick={handleRejectOrder}
                                disabled={processingOrderId === orderToReject?._id}
                            >
                                {processingOrderId === orderToReject?._id
                                    ? 'Đang xử lý...'
                                    : 'Từ chối đơn hàng'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDetails && selectedOrder && (
                <OrderDetails
                    order={selectedOrder}
                    onClose={handleCloseDetails}
                    onUpdateStatus={handleUpdateStatus}
                    onApproveOrder={handleApproveOrder}
                    onRejectOrder={handleShowRejectModal}
                    onCompleteOrder={handleCompleteOrder}
                />
            )}
        </div>
    );
}

export default OrderManager;
