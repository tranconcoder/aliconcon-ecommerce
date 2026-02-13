import React from 'react';
import classNames from 'classnames/bind';
import styles from './OrderDetails.module.scss';


const cx = classNames.bind(styles);

function OrderDetails({
    order,
    onClose,
    onUpdateStatus,
    onApproveOrder,
    onRejectOrder,
    onCompleteOrder
}) {
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

    return (
        <div className={cx('modal-overlay')}>
            <div className={cx('order-details-modal')}>
                <div className={cx('modal-header')}>
                    <h2>Chi Tiết Đơn Hàng #{order._id}</h2>
                    <button className={cx('close-btn')} onClick={onClose}>
                        &times;
                    </button>
                </div>

                <div className={cx('modal-content')}>
                    <div className={cx('order-status-section')}>
                        <div className={cx('status-header')}>
                            <h3>Trạng Thái Đơn Hàng</h3>
                            <span className={cx('status', order.order_status)}>
                                {getStatusText(order.order_status)}
                            </span>
                        </div>

                        {order.order_status !== 'completed' &&
                            order.order_status !== 'cancelled' && (
                                <div className={cx('status-actions')}>
                                    <h4>Cập Nhật Trạng Thái:</h4>
                                    <div className={cx('action-buttons')}>
                                        {order.order_status === 'pending' && (
                                            <>
                                                <button
                                                    className={cx('process-btn')}
                                                    onClick={() =>
                                                        onApproveOrder && onApproveOrder(order._id)
                                                    }
                                                >
                                                    Xác Nhận Đơn Hàng
                                                </button>
                                                <button
                                                    className={cx('cancel-btn')}
                                                    onClick={() =>
                                                        onRejectOrder && onRejectOrder(order)
                                                    }
                                                >
                                                    Từ Chối Đơn Hàng
                                                </button>
                                            </>
                                        )}

                                        {order.order_status === 'delivering' && (
                                            <button
                                                className={cx('deliver-btn')}
                                                onClick={() =>
                                                    onCompleteOrder && onCompleteOrder(order._id)
                                                }
                                            >
                                                Xác Nhận Đã Giao
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                    </div>

                    <div className={cx('order-info-grid')}>
                        <div className={cx('info-section')}>
                            <h3>Thông Tin Khách Hàng</h3>
                            <div className={cx('info-content')}>
                                <div className={cx('info-row')}>
                                    <span className={cx('info-label')}>Tên khách hàng:</span>
                                    <span className={cx('info-value')}>
                                        {order.customer_full_name}
                                    </span>
                                </div>
                                <div className={cx('info-row')}>
                                    <span className={cx('info-label')}>Email:</span>
                                    <span className={cx('info-value')}>{order.customer_email}</span>
                                </div>
                                <div className={cx('info-row')}>
                                    <span className={cx('info-label')}>Số điện thoại:</span>
                                    <span className={cx('info-value')}>{order.customer_phone}</span>
                                </div>
                            </div>
                        </div>

                        <div className={cx('info-section')}>
                            <h3>Thông Tin Đơn Hàng</h3>
                            <div className={cx('info-content')}>
                                <div className={cx('info-row')}>
                                    <span className={cx('info-label')}>Mã đơn hàng:</span>
                                    <span className={cx('info-value')}>{order._id}</span>
                                </div>
                                <div className={cx('info-row')}>
                                    <span className={cx('info-label')}>Ngày đặt hàng:</span>
                                    <span className={cx('info-value')}>
                                        {formatDate(order.created_at)}
                                    </span>
                                </div>
                                <div className={cx('info-row')}>
                                    <span className={cx('info-label')}>
                                        Phương thức thanh toán:
                                    </span>
                                    <span className={cx('info-value')}>{order.payment_type}</span>
                                </div>
                            </div>
                        </div>

                        <div className={cx('info-section', 'address-section')}>
                            <h3>Địa Chỉ Giao Hàng</h3>
                            <div className={cx('info-content')}>
                                <p className={cx('address')}>{order.customer_address}</p>
                            </div>
                        </div>
                    </div>

                    <div className={cx('order-items')}>
                        <h3>Sản Phẩm Đặt Mua</h3>
                        <div className={cx('items-table-container')}>
                            <table className={cx('items-table')}>
                                <thead>
                                    <tr>
                                        <th>Shop</th>
                                        <th>Sản Phẩm</th>
                                        <th>Đơn Giá</th>
                                        <th>Số Lượng</th>
                                        <th>Thành Tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.order_checkout?.shops_info?.map((shop) =>
                                        shop.products_info?.map((item) => (
                                            <tr key={item.id}>
                                                <td className={cx('shop-name')}>
                                                    {shop.shop_name}
                                                </td>
                                                <td className={cx('product-name')}>{item.name}</td>
                                                <td>{formatPrice(item.price)}</td>
                                                <td className={cx('quantity')}>{item.quantity}</td>
                                                <td className={cx('subtotal')}>
                                                    {formatPrice(item.price * item.quantity)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className={cx('order-summary')}>
                        <div className={cx('summary-row')}>
                            <span>Tổng tiền sản phẩm:</span>
                            <span>{formatPrice(order.price_total_raw || 0)}</span>
                        </div>
                        <div className={cx('summary-row')}>
                            <span>Phí vận chuyển:</span>
                            <span>{formatPrice(order.order_checkout?.total_fee_ship || 0)}</span>
                        </div>
                        <div className={cx('summary-row')}>
                            <span>Giảm giá:</span>
                            <span>
                                -{formatPrice(order.order_checkout?.total_discount_price || 0)}
                            </span>
                        </div>
                        <div className={cx('summary-row', 'total')}>
                            <span>Tổng thanh toán:</span>
                            <span>{formatPrice(order.price_to_payment)}</span>
                        </div>
                    </div>
                </div>

                <div className={cx('modal-footer')}>
                    <button className={cx('close-button')} onClick={onClose}>
                        Đóng
                    </button>
                    {order.order_status === 'pending' && (
                        <button
                            className={cx('process-btn-alt')}
                            onClick={() => {
                                onApproveOrder && onApproveOrder(order._id);
                                onClose();
                            }}
                        >
                            Xác Nhận Đơn Hàng
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default OrderDetails;
