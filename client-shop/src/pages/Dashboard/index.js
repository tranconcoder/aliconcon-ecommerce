import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './Dashboard.module.scss';
import { selectCurrentUser } from '../../store/userSlice';
import { selectShopInfo } from '../../store/slices/shopSlice';
import { getMediaUrl, getTextPlaceholder } from '../../utils/media';
import analyticsService from '../../services/analyticsService';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/format';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    BarChart,
    Bar
} from 'recharts';
import { FaCalendarAlt, FaArrowUp, FaArrowDown } from 'react-icons/fa';

const cx = classNames.bind(styles);

function Dashboard() {
    const user = useSelector(selectCurrentUser);
    const shop = useSelector(selectShopInfo);
    const { showToast } = useToast();

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('month');

    const timeRangeOptions = [
        { value: 'today', label: 'Hôm nay' },
        { value: 'week', label: 'Tuần này' },
        { value: 'month', label: 'Tháng này' },
        { value: 'year', label: 'Năm này' },
        { value: 'all', label: 'Toàn bộ' }
    ];

    console.log({ shopInfo: shop, currentUser: user });

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            const response = await analyticsService.getShopDashboardStats(timeRange);

            if (response.metadata) {
                setAnalytics(response.metadata);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            // Handle case where user doesn't have a shop
            if (
                error.response?.status === 404 &&
                error.response?.data?.message?.includes('Shop not found')
            ) {
                // Don't show error toast for this case, it's expected
                console.log('User does not have a shop registered yet');
            } else {
                showToast('Lỗi khi tải thống kê cửa hàng', 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [timeRange, showToast]);

    useEffect(() => {
        if (shop?.shop_status === 'active') {
            fetchAnalytics();
        } else {
            setLoading(false);
        }
    }, [shop?.shop_status, fetchAnalytics]);

    // Get logo URL using the media utility
    const logoUrl = getMediaUrl(shop?.shop_logo);

    // Get text-based placeholder if no logo is available
    const placeholder = getTextPlaceholder(shop?.shop_name, 80);

    // Hàm chuyển đổi trạng thái shop sang tiếng Việt
    const getVietnameseStatus = (status) => {
        const statusMap = {
            active: 'HOẠT ĐỘNG',
            pending: 'CHỜ DUYỆT',
            rejected: 'BỊ TỪ CHỐI',
            suspended: 'TẠM NGƯNG'
        };
        return statusMap[status] || status.toUpperCase();
    };

    // Get stats with real analytics data or default values
    const getStats = () => {
        const baseStats = [
            {
                label: 'Trạng Thái Cửa Hàng',
                value: shop?.shop_status ? getVietnameseStatus(shop.shop_status) : 'N/A',
                icon: '🏪',
                color:
                    shop?.shop_status === 'active'
                        ? '#2ecc71'
                        : shop?.shop_status === 'pending'
                        ? '#f39c12'
                        : shop?.shop_status === 'rejected'
                        ? '#e74c3c'
                        : '#3498db'
            }
        ];

        if (shop?.shop_status === 'active' && analytics) {
            return [
                ...baseStats,
                {
                    label: 'Tổng Sản Phẩm',
                    value: analytics.overview.productCount?.total || 0,
                    icon: '📦',
                    color: '#3498db',
                    change: analytics.overview.productCount?.change
                },
                {
                    label: 'Tổng Đơn Hàng',
                    value: analytics.overview.totalOrders?.total || 0,
                    icon: '📋',
                    color: '#2ecc71',
                    change: analytics.overview.totalOrders?.change
                },
                {
                    label: 'Doanh Thu',
                    value: formatCurrency(analytics.overview.totalRevenue?.total || 0),
                    icon: '💰',
                    color: '#9b59b6',
                    change: analytics.overview.totalRevenue?.change
                }
            ];
        } else {
            return [
                ...baseStats,
                { label: 'Tổng Sản Phẩm', value: 0, icon: '📦', color: '#3498db' },
                { label: 'Tổng Đơn Hàng', value: 0, icon: '📋', color: '#2ecc71' },
                { label: 'Doanh Thu', value: '0₫', icon: '💰', color: '#9b59b6' }
            ];
        }
    };

    const renderOrderStatusChart = () => {
        if (!analytics?.orderStats) return null;

        const data = [
            {
                name: 'Chờ xác nhận',
                value: analytics.orderStats.pending?.count || 0,
                color: '#ffc107'
            },
            {
                name: 'Đã xác nhận',
                value: analytics.orderStats.confirmed?.count || 0,
                color: '#28a745'
            },
            {
                name: 'Đang giao',
                value: analytics.orderStats.shipped?.count || 0,
                color: '#17a2b8'
            },
            {
                name: 'Hoàn thành',
                value: analytics.orderStats.delivered?.count || 0,
                color: '#007bff'
            },
            { name: 'Đã hủy', value: analytics.orderStats.cancelled?.count || 0, color: '#dc3545' }
        ].filter((item) => item.value > 0);

        if (data.length === 0) return null;

        return (
            <div className={cx('chart-container')}>
                <h3>Thống kê đơn hàng theo trạng thái</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const renderOrdersByDayChart = () => {
        if (!analytics?.charts?.ordersByDay?.length) {
            return (
                <div className={cx('chart-container')}>
                    <h3>Đơn Hàng Theo Ngày</h3>
                    <div className={cx('chart-empty')}>
                        <p>Không có dữ liệu biểu đồ</p>
                    </div>
                </div>
            );
        }

        return (
            <div className={cx('chart-container')}>
                <h3>Đơn Hàng Theo Ngày</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={analytics.charts.ordersByDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip
                            formatter={(value, name) => [
                                value,
                                name === 'count' ? 'Số đơn hàng' : 'Doanh thu'
                            ]}
                            labelFormatter={(label) => `Ngày: ${label}`}
                        />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stackId="1"
                            stroke="#8884d8"
                            fill="#8884d8"
                            fillOpacity={0.6}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const renderRevenueChart = () => {
        if (!analytics?.charts?.ordersByDay?.length) {
            return (
                <div className={cx('chart-container')}>
                    <h3>Doanh Thu Theo Ngày</h3>
                    <div className={cx('chart-empty')}>
                        <p>Không có dữ liệu biểu đồ</p>
                    </div>
                </div>
            );
        }

        return (
            <div className={cx('chart-container')}>
                <h3>Doanh Thu Theo Ngày</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={analytics.charts.ordersByDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                        <Tooltip
                            formatter={(value) => [
                                `${value.toLocaleString('vi-VN')}đ`,
                                'Doanh thu'
                            ]}
                            labelFormatter={(label) => `Ngày: ${label}`}
                        />
                        <Area
                            type="monotone"
                            dataKey="totalValue"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.6}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const renderTopProductsChart = () => {
        if (!analytics?.charts?.topProducts?.length) {
            return (
                <div className={cx('chart-container')}>
                    <h3>Top 5 Sản Phẩm Có Doanh Thu Cao Nhất</h3>
                    <div className={cx('chart-empty')}>
                        <p>Không có dữ liệu sản phẩm</p>
                    </div>
                </div>
            );
        }

        const data = analytics.charts.topProducts.map((product, index) => ({
            name: product.productName || `Sản phẩm ${index + 1}`,
            revenue: product.totalRevenue,
            quantity: product.totalQuantity
        }));

        return (
            <div className={cx('chart-container')}>
                <h3>Top 5 Sản Phẩm Có Doanh Thu Cao Nhất</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                        data={data}
                        margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12 }}
                            interval={0}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                        />
                        <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                        <Tooltip
                            formatter={(value, name) => {
                                if (name === 'revenue') {
                                    return [`${value.toLocaleString('vi-VN')}đ`, 'Doanh thu'];
                                }
                                if (name === 'quantity') {
                                    return [`${value} sản phẩm`, 'Số lượng bán'];
                                }
                                return [value, name];
                            }}
                            labelFormatter={(label) => `Sản phẩm: ${label}`}
                        />
                        <Bar dataKey="revenue" fill="#3b82f6" name="revenue" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const stats = getStats();

    // Get recent orders from analytics data
    const recentOrders = analytics?.recentOrders || [];

    if (loading && shop?.shop_status === 'active') {
        return (
            <div className={cx('dashboard')}>
                <div className={cx('loading-state')}>
                    <div className={cx('loader')}></div>
                    <p>Đang tải thống kê cửa hàng...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cx('dashboard')}>
            <div className={cx('dashboard-header')}>
                <div className={cx('header-left')}>
                    <h1>{shop?.shop_name || 'Cửa Hàng Của Tôi'}</h1>
                    <p>Xin chào, {user?.user_fullName || 'Chủ Cửa Hàng'}</p>
                </div>
                {shop?.shop_status === 'active' && (
                    <div className={cx('header-right')}>
                        <div className={cx('time-selector')}>
                            <FaCalendarAlt className={cx('calendar-icon')} />
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                className={cx('time-dropdown')}
                            >
                                {timeRangeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {shop?.shop_status === 'pending' && (
                <div className={cx('shop-status-alert', 'pending')}>
                    Cửa hàng của bạn đang được xem xét. Bạn sẽ có thể bán sản phẩm sau khi được phê
                    duyệt.
                </div>
            )}

            {shop?.shop_status === 'rejected' && (
                <div className={cx('shop-status-alert', 'rejected')}>
                    Đăng ký cửa hàng của bạn đã bị từ chối. Vui lòng liên hệ bộ phận hỗ trợ để biết
                    thêm thông tin.
                </div>
            )}

            <div className={cx('shop-profile-card')}>
                <div className={cx('shop-profile-header')}>
                    <div className={cx('shop-logo')}>
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={shop.shop_name}
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
                    <div className={cx('shop-info')}>
                        <h2>{shop?.shop_name || 'Cửa Hàng Của Tôi'}</h2>
                        <div className={cx('shop-details')}>
                            <div className={cx('shop-detail-item')}>
                                <span className={cx('label')}>Email:</span>
                                <span>{shop?.shop_email || 'N/A'}</span>
                            </div>
                            <div className={cx('shop-detail-item')}>
                                <span className={cx('label')}>Điện thoại:</span>
                                <span>{shop?.shop_phoneNumber || 'N/A'}</span>
                            </div>
                            <div className={cx('shop-detail-item')}>
                                <span className={cx('label')}>Loại:</span>
                                <span>
                                    {shop?.shop_type === 'INDIVIDUAL'
                                        ? 'Cá nhân'
                                        : shop?.shop_type === 'ENTERPRISE'
                                        ? 'Doanh nghiệp'
                                        : shop?.shop_type || 'N/A'}
                                </span>
                            </div>
                            <div className={cx('shop-detail-item')}>
                                <span className={cx('label')}>Ngày tạo:</span>
                                <span>
                                    {shop?.created_at
                                        ? new Date(shop.created_at).toLocaleDateString()
                                        : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                {shop?.shop_description && (
                    <div className={cx('shop-description')}>
                        <h3>Thông Tin Cửa Hàng</h3>
                        <p>{shop.shop_description}</p>
                    </div>
                )}
            </div>

            <div className={cx('stats-grid')}>
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className={cx('stat-card')}
                        style={{ borderColor: stat.color }}
                    >
                        <div className={cx('stat-icon')} style={{ backgroundColor: stat.color }}>
                            <span>{stat.icon}</span>
                        </div>
                        <div className={cx('stat-details')}>
                            <div className={cx('stat-value')}>{stat.value}</div>
                            <div className={cx('stat-label')}>{stat.label}</div>
                            {stat.change !== undefined && (
                                <div
                                    className={cx('stat-change', {
                                        positive: stat.change >= 0,
                                        negative: stat.change < 0
                                    })}
                                >
                                    {stat.change >= 0 ? <FaArrowUp /> : <FaArrowDown />}
                                    <span>{Math.abs(stat.change)}%</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section - Only show if shop is active and has data */}
            {shop?.shop_status === 'active' && analytics && (
                <div className={cx('charts-section')}>
                    <div className={cx('charts-grid')}>
                        <div className={cx('chart-wrapper')}>{renderOrdersByDayChart()}</div>
                        <div className={cx('chart-wrapper')}>{renderRevenueChart()}</div>
                    </div>
                    <div className={cx('charts-grid')}>
                        <div className={cx('chart-wrapper')}>{renderOrderStatusChart()}</div>
                        <div className={cx('chart-wrapper')}>{renderTopProductsChart()}</div>
                    </div>
                </div>
            )}

            <div className={cx('dashboard-row')}>
                <div className={cx('dashboard-column')}>
                    <div className={cx('dashboard-card')}>
                        <h2>Đơn Hàng Gần Đây</h2>
                        {recentOrders.length > 0 ? (
                            <>
                                <table className={cx('orders-table')}>
                                    <thead>
                                        <tr>
                                            <th>Mã Đơn</th>
                                            <th>Khách Hàng</th>
                                            <th>Ngày</th>
                                            <th>Trạng Thái</th>
                                            <th>Tổng Tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.map((order) => (
                                            <tr key={order.orderId}>
                                                <td>#{order.orderId.slice(-6)}</td>
                                                <td>{order.customerName}</td>
                                                <td>
                                                    {order.orderDate
                                                        ? new Date(
                                                              order.orderDate
                                                          ).toLocaleDateString('vi-VN')
                                                        : 'N/A'}
                                                </td>
                                                <td>
                                                    <span
                                                        className={cx(
                                                            'status',
                                                            order.status
                                                                .toLowerCase()
                                                                .replace('_', '-')
                                                        )}
                                                    >
                                                        {getVietnameseStatus(order.status)}
                                                    </span>
                                                </td>
                                                <td>{order.amount.toLocaleString('vi-VN')}đ</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className={cx('table-footer')}>
                                    <p>Hiển thị {recentOrders.length} đơn hàng gần đây nhất</p>
                                </div>
                            </>
                        ) : (
                            <div className={cx('empty-state')}>
                                <p>Chưa có đơn hàng nào</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className={cx('dashboard-column')}>
                    <div className={cx('dashboard-card')}>
                        <h2>Thao Tác Nhanh</h2>
                        <div className={cx('action-buttons')}>
                            <Link
                                to="/products/new"
                                className={cx('action-btn', 'create-product', {
                                    disabled: shop?.shop_status !== 'active'
                                })}
                            >
                                Thêm Sản Phẩm Mới
                            </Link>
                            <Link
                                to="/discount"
                                className={cx('action-btn', 'create-discount', {
                                    disabled: shop?.shop_status !== 'active'
                                })}
                            >
                                Tạo Khuyến Mãi
                            </Link>
                            <Link to="/settings" className={cx('action-btn', 'settings')}>
                                Cài Đặt Cửa Hàng
                            </Link>
                        </div>
                    </div>
                    {shop?.shop_warehouses && shop.shop_warehouses.length > 0 && (
                        <div className={cx('dashboard-card')}>
                            <h2>Kho Hàng</h2>
                            <div className={cx('warehouse-list')}>
                                {shop.shop_warehouses.map((warehouse, index) => (
                                    <div key={index} className={cx('warehouse-item')}>
                                        <div className={cx('warehouse-name')}>
                                            <span className={cx('warehouse-icon')}>🏭</span>
                                            {warehouse.name}
                                        </div>
                                        <div className={cx('warehouse-contact')}>
                                            Điện thoại: {warehouse.phoneNumber}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
