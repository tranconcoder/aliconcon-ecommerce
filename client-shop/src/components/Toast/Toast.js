import React, { useState, useEffect, useCallback } from 'react';
import classNames from 'classnames/bind';
import styles from './Toast.module.scss';

const cx = classNames.bind(styles);

const Toast = ({ id, message, type = 'success', duration = 3000, onClose }) => {
    const [show, setShow] = useState(false);
    const [exit, setExit] = useState(false);

    const handleClose = useCallback(() => {
        setExit(true);
        setTimeout(() => {
            onClose(id);
        }, 300); // Match animation duration
    }, [id, onClose]);

    useEffect(() => {
        setShow(true);
        const timer = setTimeout(() => {
            handleClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, handleClose]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            case 'info':
                return 'ℹ️';
            case 'warning':
                return '⚠️';
            default:
                return '✉️';
        }
    };

    return (
        <div
            className={cx('toast', type, {
                show: show,
                'toast-exit': exit
            })}
        >
            <div className={cx('toast-content')}>
                <span className={cx('toast-icon')}>{getIcon()}</span>
                <span className={cx('toast-message')}>{message}</span>
            </div>
            <button className={cx('toast-close')} onClick={handleClose}>
                ×
            </button>
        </div>
    );
};

const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className={cx('toast-container')}>
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    id={toast.id}
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={removeToast}
                />
            ))}
        </div>
    );
};

export default ToastContainer;
