import { io } from 'socket.io-client';
import store from '../store';
import { API_URL, API_URL_HTTPS } from '../configs/env.config';
import {
    setConnected,
    setConnectionError,
    addMessage,
    updateMessageStatus,
    setUserTyping,
    setUserStopTyping,
    updateUserOnlineStatus,
    markConversationAsRead
} from '../store/slices/chatSlice';

// AGGRESSIVE WebSocket blocking at module level
if (typeof window !== 'undefined') {
    // Block WebSocket constructor completely

    window.WebSocket = function (...args) {
        console.warn('🛡️ WebSocket blocked to prevent crashes - using polling instead');
        throw new Error('WebSocket disabled for stability - using polling transport');
    };

    // Also block any WebSocket creation attempts
    if (window.WebSocket) {
        window.WebSocket.prototype = {};
    }
}

class SocketService {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isConnecting = false;
        // Primary connection URLs
        this.connectionUrls = [API_URL, API_URL_HTTPS];
        this.currentUrlIndex = 0;
        this.hasTriedPollingOnly = false;

        // Add comprehensive error handlers to prevent crashes
        this.setupComprehensiveErrorHandlers();
    }

    setupComprehensiveErrorHandlers() {
        // Catch unhandled WebSocket errors that could crash React/Node
        if (typeof window !== 'undefined') {
            // Browser environment error handlers
            window.addEventListener('error', (event) => {
                if (this.isWebSocketError(event.error)) {
                    console.warn('🛡️ Caught WebSocket error to prevent crash:', event.error);
                    event.preventDefault();
                    event.stopPropagation();
                    store.dispatch(
                        setConnectionError('WebSocket connection issue (using polling fallback)')
                    );
                    return false;
                }
            });

            window.addEventListener('unhandledrejection', (event) => {
                if (this.isWebSocketError(event.reason)) {
                    console.warn(
                        '🛡️ Caught WebSocket promise rejection to prevent crash:',
                        event.reason
                    );
                    event.preventDefault();
                    store.dispatch(
                        setConnectionError('WebSocket connection issue (using polling fallback)')
                    );
                    return false;
                }
            });
        }

        // Global process error handlers for Node.js environment
        if (typeof process !== 'undefined') {
            const originalEmit = process.emit;
            process.emit = function (name, data, ...args) {
                if (name === 'uncaughtException' || name === 'unhandledRejection') {
                    if (data && this.isWebSocketError && this.isWebSocketError(data)) {
                        console.warn('🛡️ Caught process-level WebSocket error:', data);
                        store.dispatch(
                            setConnectionError(
                                'WebSocket connection issue (using polling fallback)'
                            )
                        );
                        return false;
                    }
                }
                return originalEmit.apply(this, [name, data, ...args]);
            }.bind(this);
        }
    }

    isWebSocketError(error) {
        if (!error) return false;
        const message = error.message || error.toString();
        return (
            message &&
            (message.includes('#state') ||
                message.includes('WebSocket') ||
                message.includes('ws:') ||
                message.includes('Socket.IO') ||
                message.includes('terminate') ||
                message.includes('handshake') ||
                message.includes('CLOSING'))
        );
    }

    async connect(token) {
        if (this.socket?.connected) {
            console.log('Socket already connected');
            return;
        }

        if (this.isConnecting) {
            console.log('Connection already in progress');
            return;
        }

        this.isConnecting = true;

        try {
            // Try connecting with different URLs if needed
            await this.attemptConnection(token);
        } catch (error) {
            console.error('Connection failed completely:', error);
            this.isConnecting = false;
            store.dispatch(setConnectionError('Unable to establish connection'));
        }
    }

    async attemptConnection(token) {
        const serverUrl = this.connectionUrls[this.currentUrlIndex];
        console.log(`🔗 Attempting connection to: ${serverUrl}`);

        try {
            // Clean up any existing socket
            if (this.socket) {
                this.safeDisconnect();
            }

            // ULTRA-AGGRESSIVE WebSocket prevention configuration
            const socketConfig = {
                auth: {
                    token: token
                },
                // ABSOLUTELY FORCE polling only - NEVER use WebSocket
                transports: ['polling'],
                timeout: 20000,
                forceNew: true,
                upgrade: false, // NEVER upgrade to WebSocket
                rememberUpgrade: false,
                autoConnect: true,
                reconnection: false, // We handle reconnection manually

                // HTTPS specific options
                secure: serverUrl.startsWith('https'),
                rejectUnauthorized: false, // Allow self-signed certificates in development

                // Additional safety options
                withCredentials: false,
                extraHeaders: {},

                // Polling specific options
                forceBase64: false,
                enablesXDR: false,
                timestampRequests: true,
                timestampParam: 't',

                // COMPLETELY disable ALL WebSocket-related features
                perMessageDeflate: false,
                httpCompression: false,

                // Force polling transport configuration
                transportOptions: {
                    polling: {
                        extraHeaders: {},
                        xdomain: false
                    }
                },

                // AGGRESSIVE WebSocket prevention
                jsonp: false,
                forceJSONP: false,
                websocket: false,
                flashsocket: false,

                // Additional WebSocket blocking options
                allowEIO3: false,
                allowEIO4: false,

                // Force specific engine.io version that supports polling-only
                forcePolling: true,

                // Disable all upgrade mechanisms
                allowUpgrades: false,

                // Additional safety measures for HTTPS
                agent: false,
                pfx: undefined,
                key: undefined,
                cert: undefined,
                ca: undefined,
                ciphers: undefined,

                // Prevent any WebSocket protocol negotiation
                protocols: [],

                // Force HTTP/HTTPS only, no WS/WSS
                forceHTTP: true
            };

            // Extra safety for localhost HTTPS - completely disable SSL WebSocket features
            if (serverUrl.includes('localhost') && serverUrl.startsWith('https')) {
                socketConfig.rejectUnauthorized = false;
                socketConfig.checkServerIdentity = false;
                socketConfig.agent = false;
                // Explicitly disable WebSocket for localhost HTTPS
                socketConfig.websocket = false;
                socketConfig.allowUpgrades = false;
            }

            console.log('🔧 Creating socket with ULTRA-SAFE polling-only config...');

            // Wrap socket creation in try-catch to prevent crashes
            try {
                this.socket = io(serverUrl, socketConfig);
            } catch (createError) {
                console.error('❌ Socket creation failed:', createError);
                throw new Error(`Socket creation failed: ${createError.message}`);
            }

            // CRITICAL: Force disable WebSocket at engine level after creation
            if (this.socket && this.socket.io && this.socket.io.engine) {
                try {
                    // Disable WebSocket transport at engine level
                    this.socket.io.engine.upgrade = false;
                    this.socket.io.engine.rememberUpgrade = false;

                    // Remove WebSocket from available transports
                    if (this.socket.io.engine.transports) {
                        this.socket.io.engine.transports = ['polling'];
                    }
                } catch (engineError) {
                    console.warn('Engine modification warning (ignored):', engineError);
                }
            }

            // Wrap event listeners in try-catch to prevent crashes
            this.setupSafeEventListeners();

            // Wait for connection with proper error handling
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 15000);

                const cleanup = () => {
                    clearTimeout(timeout);
                };

                this.socket.once('connect', () => {
                    cleanup();
                    const transport = this.socket.io.engine.transport.name;
                    console.log(`✅ Connected to ${serverUrl} using transport: ${transport}`);

                    // CRITICAL: Verify we're using polling and NEVER WebSocket
                    if (transport !== 'polling') {
                        console.error(
                            '❌ CRITICAL: Non-polling transport detected, forcing disconnect'
                        );
                        this.safeDisconnect();
                        reject(new Error(`Unsafe transport detected: ${transport}`));
                        return;
                    }

                    // Additional safety check - ensure no WebSocket upgrade is possible
                    if (this.socket.io.engine.upgrade) {
                        console.warn('⚠️ Disabling upgrade capability');
                        this.socket.io.engine.upgrade = false;
                    }

                    resolve();
                });

                this.socket.once('connect_error', (error) => {
                    cleanup();
                    console.error(`❌ Connection failed to ${serverUrl}:`, error.message);
                    reject(error);
                });

                this.socket.once('error', (error) => {
                    cleanup();
                    console.error(`❌ Socket error for ${serverUrl}:`, error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error(`❌ Connection failed to ${serverUrl}:`, error);

            // Clean up failed socket
            this.safeDisconnect();

            // Try next HTTPS URL if available
            if (this.currentUrlIndex < this.connectionUrls.length - 1) {
                this.currentUrlIndex++;
                console.log('🔄 Trying next HTTPS URL...');
                await this.attemptConnection(token);
                return;
            }

            // All connection attempts failed - try ultra-safe polling mode
            if (
                this.currentUrlIndex >= this.connectionUrls.length - 1 &&
                !this.hasTriedPollingOnly
            ) {
                console.log('🛡️ Trying ultra-safe polling-only fallback...');
                this.hasTriedPollingOnly = true;
                this.currentUrlIndex = 0;
                await this.attemptUltraSafeConnection(token);
                return;
            }

            // All HTTPS connection attempts failed
            this.isConnecting = false;
            this.currentUrlIndex = 0;
            store.dispatch(setConnectionError(`Connection failed: ${error.message}`));

            // Schedule retry
            this.handleReconnect();
        }
    }

    async attemptUltraSafeConnection(token) {
        const serverUrl = this.connectionUrls[0]; // Use primary URL
        console.log(`🛡️ Attempting ULTRA-SAFE polling connection to: ${serverUrl}`);

        try {
            this.safeDisconnect();

            // MAXIMUM SAFETY configuration - absolutely no WebSocket features
            this.socket = io(serverUrl, {
                auth: { token },
                transports: ['polling'], // ONLY polling
                upgrade: false, // NEVER upgrade
                rememberUpgrade: false,
                timeout: 30000,
                forceNew: true,
                autoConnect: true,
                reconnection: false,
                secure: serverUrl.startsWith('https'),
                rejectUnauthorized: false,
                withCredentials: false,
                forceBase64: false,
                // Disable EVERYTHING WebSocket-related
                websocket: false,
                flashsocket: false,
                jsonp: false,
                forceJSONP: false,
                allowUpgrades: false,
                forcePolling: true,
                // Additional blocking
                protocols: [],
                agent: false
            });

            this.setupSafeEventListeners();

            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Ultra-safe polling connection timeout'));
                }, 25000);

                this.socket.once('connect', () => {
                    clearTimeout(timeout);
                    console.log('✅ Ultra-safe polling connection successful');
                    resolve();
                });

                this.socket.once('connect_error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });
        } catch (error) {
            console.error('❌ Ultra-safe polling connection failed:', error);
            this.isConnecting = false;
            this.safeDisconnect();
            store.dispatch(setConnectionError(`All connection attempts failed: ${error.message}`));
            this.handleReconnect();
        }
    }

    safeDisconnect() {
        if (this.socket) {
            try {
                // Remove all listeners first
                this.socket.removeAllListeners();

                // Safely disconnect
                if (this.socket.connected) {
                    this.socket.disconnect();
                }

                // Force cleanup
                if (this.socket.io && this.socket.io.engine) {
                    try {
                        this.socket.io.engine.close();
                    } catch (engineError) {
                        console.warn('Engine close error (ignored):', engineError);
                    }
                }
            } catch (error) {
                console.warn('⚠️ Error during socket disconnect (ignored):', error);
            } finally {
                this.socket = null;
            }
        }
    }

    setupSafeEventListeners() {
        if (!this.socket) return;

        // Wrap all event listeners in try-catch to prevent crashes
        const safeOn = (event, handler) => {
            this.socket.on(event, (...args) => {
                try {
                    handler(...args);
                } catch (error) {
                    console.error(`❌ Error in ${event} handler:`, error);
                    // Don't let handler errors crash the app
                }
            });
        };

        // Connection events
        safeOn('connect', () => {
            console.log('✅ Connected to chat server');
            store.dispatch(setConnected(true));
            store.dispatch(setConnectionError(null));
            this.reconnectAttempts = 0;
            this.isConnecting = false;
            this.currentUrlIndex = 0;
            this.hasTriedPollingOnly = false;
        });

        safeOn('disconnect', (reason) => {
            console.log('🔌 Disconnected from chat server:', reason);
            store.dispatch(setConnected(false));
            this.isConnecting = false;

            if (
                reason === 'io server disconnect' ||
                reason === 'transport close' ||
                reason === 'transport error'
            ) {
                this.handleReconnect();
            }
        });

        safeOn('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            this.isConnecting = false;
            store.dispatch(setConnectionError(error.message));
        });

        // Authentication events
        safeOn('authenticated', (data) => {
            console.log('🔐 Socket authenticated:', data);
            store.dispatch(setConnected(true));
        });

        // Message events
        safeOn('new_message', (message) => {
            console.log('📨 New message received:', message);
            store.dispatch(
                addMessage({
                    conversationId: message.conversationId,
                    message: message
                })
            );
        });

        safeOn('message_sent', (message) => {
            console.log('📤 Message sent confirmation:', message);
            store.dispatch(
                addMessage({
                    conversationId: message.conversationId,
                    message: message
                })
            );
        });

        safeOn('message_delivered', (data) => {
            console.log('📬 Message delivered:', data);
            store.dispatch(
                updateMessageStatus({
                    conversationId: data.conversationId,
                    messageId: data._id,
                    status: 'delivered'
                })
            );
        });

        safeOn('messages_read', (data) => {
            console.log('👁️ Messages read:', data);
            store.dispatch(markConversationAsRead(data.conversationId));
        });

        // Typing events
        safeOn('user_typing', (data) => {
            console.log('⌨️ User typing:', data);
            store.dispatch(
                setUserTyping({
                    conversationId: data.conversationId,
                    userId: data.userId,
                    user: data.user
                })
            );
        });

        safeOn('user_stop_typing', (data) => {
            console.log('⌨️ User stop typing:', data);
            store.dispatch(
                setUserStopTyping({
                    conversationId: data.conversationId,
                    userId: data.userId
                })
            );
        });

        // Conversation events
        safeOn('joined_conversation', (data) => {
            console.log('🚪 Joined conversation:', data);
        });

        safeOn('left_conversation', (data) => {
            console.log('🚪 Left conversation:', data);
        });

        // Error events
        safeOn('error', (error) => {
            console.error('❌ Socket error:', error);
            store.dispatch(setConnectionError(error.message));
        });

        // User status events
        safeOn('user_online', (data) => {
            store.dispatch(
                updateUserOnlineStatus({
                    userId: data.userId,
                    isOnline: true
                })
            );
        });

        safeOn('user_offline', (data) => {
            store.dispatch(
                updateUserOnlineStatus({
                    userId: data.userId,
                    isOnline: false
                })
            );
        });
    }

    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('❌ Max reconnection attempts reached');
            store.dispatch(setConnectionError('Unable to connect to chat server'));
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            if (!this.socket?.connected && !this.isConnecting) {
                const token = localStorage.getItem('access_token');
                if (token) {
                    this.connect(token);
                }
            }
        }, delay);
    }

    // Message methods with error handling
    sendMessage(receiverId, content, type = 'text') {
        try {
            if (!this.socket?.connected) {
                console.error('❌ Socket not connected');
                return false;
            }

            console.log('📤 Sending message:', { receiverId, content, type });
            this.socket.emit('send_message', {
                receiverId,
                content,
                type
            });
            return true;
        } catch (error) {
            console.error('❌ Error sending message:', error);
            return false;
        }
    }

    markAsRead(conversationId, messageIds = []) {
        try {
            if (!this.socket?.connected) {
                console.error('❌ Socket not connected');
                return false;
            }

            this.socket.emit('mark_as_read', {
                conversationId,
                messageIds
            });
            return true;
        } catch (error) {
            console.error('❌ Error marking as read:', error);
            return false;
        }
    }

    joinConversation(conversationId) {
        try {
            if (!this.socket?.connected) {
                console.error('❌ Socket not connected');
                return false;
            }

            this.socket.emit('join_conversation', {
                conversationId
            });
            return true;
        } catch (error) {
            console.error('❌ Error joining conversation:', error);
            return false;
        }
    }

    leaveConversation(conversationId) {
        try {
            if (!this.socket?.connected) {
                console.error('❌ Socket not connected');
                return false;
            }

            this.socket.emit('leave_conversation', {
                conversationId
            });
            return true;
        } catch (error) {
            console.error('❌ Error leaving conversation:', error);
            return false;
        }
    }

    // Typing methods with error handling
    startTyping(conversationId, receiverId = null) {
        try {
            if (!this.socket?.connected) {
                console.error('❌ Socket not connected');
                return false;
            }

            this.socket.emit('typing_start', {
                conversationId,
                receiverId
            });
            return true;
        } catch (error) {
            console.error('❌ Error starting typing:', error);
            return false;
        }
    }

    stopTyping(conversationId, receiverId = null) {
        try {
            if (!this.socket?.connected) {
                console.error('❌ Socket not connected');
                return false;
            }

            this.socket.emit('typing_stop', {
                conversationId,
                receiverId
            });
            return true;
        } catch (error) {
            console.error('❌ Error stopping typing:', error);
            return false;
        }
    }

    // Connection methods
    disconnect() {
        console.log('🔌 Disconnecting socket...');
        this.isConnecting = false;
        this.safeDisconnect();
        store.dispatch(setConnected(false));
    }

    isConnected() {
        try {
            return this.socket?.connected || false;
        } catch (error) {
            console.error('❌ Error checking connection status:', error);
            return false;
        }
    }

    // Get socket instance (for debugging or advanced usage)
    getSocket() {
        return this.socket;
    }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
