import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import classNames from 'classnames/bind';
import styles from './ShopSidebar.module.scss';
import { selectShopInfo } from '../../store/slices/shopSlice';
import { selectTotalUnreadCount } from '../../store/slices/chatSlice';
import { getMediaUrl, getTextPlaceholder } from '../../utils/media';
// Import icons
import {
    MdDashboard,
    MdInventory,
    MdShoppingCart,
    MdPeople,
    MdOutlineSettings,
    MdChevronLeft,
    MdChevronRight,
    MdDiscount,
    MdWarehouse,
    MdChat,
    MdStar
} from 'react-icons/md';

const cx = classNames.bind(styles);

function ShopSidebar({ collapsed, toggleSidebar }) {
    // Get shop information from Redux state
    const shopInfo = useSelector(selectShopInfo);
    const totalUnreadCount = useSelector(selectTotalUnreadCount);
    console.log(shopInfo);

    const navItems = [
        { path: '/dashboard', icon: <MdDashboard className={cx('nav-icon')} />, text: 'Tổng Quan' },
        {
            path: '/products',
            icon: <MdInventory className={cx('nav-icon')} />,
            text: 'Sản Phẩm'
        },
        {
            path: '/warehouse',
            icon: <MdWarehouse className={cx('nav-icon')} />,
            text: 'Kho Hàng'
        },
        {
            path: '/orders',
            icon: <MdShoppingCart className={cx('nav-icon')} />,
            text: 'Đơn Hàng'
        },
        {
            path: '/discounts',
            icon: <MdDiscount className={cx('nav-icon')} />,
            text: 'Khuyến Mãi'
        },
        {
            path: '/chat',
            icon: <MdChat className={cx('nav-icon')} />,
            text: 'Tin Nhắn',
            badge: totalUnreadCount > 0 ? totalUnreadCount : null
        },
        {
            path: '/reviews',
            icon: <MdStar className={cx('nav-icon')} />,
            text: 'Đánh Giá'
        },
        {
            path: '/customers',
            icon: <MdPeople className={cx('nav-icon')} />,
            text: 'Khách Hàng'
        },
        {
            path: '/settings',
            icon: <MdOutlineSettings className={cx('nav-icon')} />,
            text: 'Cài Đặt'
        }
    ];

    // Get shop name from Redux state or use default
    const shopName = shopInfo?.shop_name || 'Cửa Hàng Của Tôi';
    const shopStatus = shopInfo?.shop_status || 'pending';

    // Get logo URL using the media utility - Fix accessing shop_logo directly from shopInfo
    const logoUrl = getMediaUrl(shopInfo?.shop_logo);

    // Get text-based placeholder if no logo is available
    const placeholder = getTextPlaceholder(shopInfo?.shop_name, 40);

    // Hàm chuyển đổi trạng thái shop sang tiếng Việt
    const getVietnameseStatus = (status) => {
        const statusMap = {
            pending: 'Chờ Duyệt',
            active: 'Hoạt Động',
            rejected: 'Bị Từ Chối',
            suspended: 'Tạm Ngưng'
        };
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    };

    return (
        <div className={cx('shop-sidebar', { collapsed })}>
            <div className={cx('shop-info')}>
                <div className={cx('shop-logo')}>
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={shopName}
                            onError={(e) => {
                                e.target.onerror = null;
                                // Use text placeholder instead of external image
                                const parent = e.target.parentNode;
                                const div = document.createElement('div');
                                div.className = cx('shop-logo-placeholder');
                                div.style.backgroundColor = placeholder.backgroundColor;
                                div.style.color = placeholder.color;
                                div.textContent = placeholder.text;
                                parent.replaceChild(div, e.target);
                            }}
                        />
                    ) : (
                        <div
                            className={cx('shop-logo-placeholder')}
                            style={{
                                backgroundColor: placeholder.backgroundColor,
                                color: placeholder.color
                            }}
                        >
                            {placeholder.text}
                        </div>
                    )}
                </div>
                {!collapsed && (
                    <div className={cx('shop-details')}>
                        <div className={cx('shop-name')}>{shopName}</div>
                        <div className={cx('shop-status', shopStatus)}>
                            {getVietnameseStatus(shopStatus)}
                        </div>
                    </div>
                )}
            </div>
            <nav className={cx('nav-menu')}>
                <ul>
                    {navItems.map((item, index) => (
                        <li key={index}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) => cx({ active: isActive })}
                            >
                                {item.icon}
                                {!collapsed && (
                                    <span className={cx('nav-text')}>
                                        {item.text}
                                        {item.badge && (
                                            <span className={cx('nav-badge')}>
                                                {item.badge > 99 ? '99+' : item.badge}
                                            </span>
                                        )}
                                    </span>
                                )}
                            </NavLink>
                        </li>
                    ))}
                    <li className={cx('toggle-item')}>
                        <button className={cx('toggle-btn-nav')} onClick={toggleSidebar}>
                            {collapsed ? (
                                <MdChevronRight className={cx('nav-icon')} />
                            ) : (
                                <MdChevronLeft className={cx('nav-icon')} />
                            )}
                            {!collapsed && <span className={cx('nav-text')}>Thu Gọn</span>}
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    );
}

export default ShopSidebar;
