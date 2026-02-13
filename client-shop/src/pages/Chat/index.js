import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import classNames from 'classnames/bind';
import styles from './Chat.module.scss';
import socketService from '../../services/socketService';
import { getMediaUrl, getTextPlaceholder } from '../../utils/media';
import { createKeyHandler } from '../../utils/keyboardSafety';
import {
    selectCurrentUser,
    selectUserId,
    selectIsAuthenticated,
    fetchUserProfile
} from '../../store/userSlice';
import {
    fetchConversations,
    fetchMessages,
    startConversation,
    searchUsers,
    setActiveConversation,
    markConversationAsRead,
    clearSearchResults,
    setCurrentUserTyping,
    selectConversations,
    selectConversationsLoading,
    selectActiveConversationId,
    selectActiveConversation,
    selectMessages,
    selectMessagesLoading,
    selectSearchResults,
    selectSearchLoading,
    selectSearchQuery,
    selectIsConnected,
    selectConnectionError,
    selectTypingUsers
} from '../../store/slices/chatSlice';

// Icons
import {
    MdSearch,
    MdAdd,
    MdSend,
    MdAttachFile,
    MdEmojiEmotions,
    MdMoreVert,
    MdPhone,
    MdVideoCall,
    MdCheck,
    MdDoneAll,
    MdChatBubbleOutline,
    MdRefresh
} from 'react-icons/md';

const cx = classNames.bind(styles);

function Chat() {
    const dispatch = useDispatch();
    const currentUser = useSelector(selectCurrentUser);
    const currentUserId = useSelector(selectUserId);
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const conversations = useSelector(selectConversations);
    const conversationsLoading = useSelector(selectConversationsLoading);
    const activeConversationId = useSelector(selectActiveConversationId);
    const activeConversation = useSelector(selectActiveConversation);
    const messages = useSelector(selectMessages(activeConversationId));
    const messagesLoading = useSelector(selectMessagesLoading(activeConversationId));
    const searchResults = useSelector(selectSearchResults);
    const searchLoading = useSelector(selectSearchLoading);
    useSelector(selectSearchQuery);
    const isConnected = useSelector(selectIsConnected);
    const connectionError = useSelector(selectConnectionError);
    const typingUsers = useSelector(selectTypingUsers(activeConversationId));

    // Debug log for user data
    console.log('Chat component - User data:', { currentUser, currentUserId, isAuthenticated });

    // Local state
    const [messageInput, setMessageInput] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [conversationsLoaded, setConversationsLoaded] = useState(false);
    const [chatAccessed, setChatAccessed] = useState(false);
    const [userProfileLoaded, setUserProfileLoaded] = useState(false);

    // Refs
    const messagesEndRef = useRef(null);
    const messageInputRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    console.log('CURRENT USER ID', currentUserId);

    // Component mount debug
    useEffect(() => {
        console.log('Chat component mounted');
        return () => {
            console.log('Chat component unmounted');
        };
    }, []);

    // First useEffect: Fetch user profile if needed
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        console.log('Checking user profile availability:', {
            hasToken: !!token,
            isAuthenticated,
            hasUserId: !!currentUserId,
            userProfileLoaded
        });

        if (token && isAuthenticated && !currentUserId && !userProfileLoaded) {
            console.log('Fetching user profile...');
            setUserProfileLoaded(true);
            dispatch(fetchUserProfile());
        }
    }, [dispatch, isAuthenticated, currentUserId, userProfileLoaded]);

    // Second useEffect: Load conversations when user data is available
    useEffect(() => {
        console.log('Conversation loading check:', {
            currentUserId,
            conversationsLoaded,
            chatAccessed
        });

        const token = localStorage.getItem('access_token');

        console.log('TOKEN', token);
        console.log('CURRENT USER ID', currentUserId);
        console.log('CONVERSATIONS LOADED', conversationsLoaded);
        console.log('CHAT ACCESSED', chatAccessed);

        if (token && currentUserId && !conversationsLoaded) {
            console.log('Loading conversations and connecting socket...');

            // Set chat as accessed
            if (!chatAccessed) {
                setChatAccessed(true);
            }

            // Connect to socket
            socketService.connect(token);
            console.log('Socket connection initiated');

            // Load conversations
            console.log('Dispatching fetchConversations...');
            dispatch(fetchConversations({ limit: 20, page: 1 }));
            setConversationsLoaded(true);
        } else {
            console.log('Cannot load conversations yet:', {
                hasToken: !!token,
                hasUserId: !!currentUserId,
                conversationsLoaded
            });
        }
    }, [currentUserId, conversationsLoaded, chatAccessed, dispatch]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch messages when active conversation changes
    useEffect(() => {
        if (activeConversationId && chatAccessed) {
            dispatch(fetchMessages({ conversationId: activeConversationId, limit: 30 }));

            // Join conversation for real-time updates
            socketService.joinConversation(activeConversationId);

            // Mark conversation as read
            dispatch(markConversationAsRead(activeConversationId));
            socketService.markAsRead(activeConversationId);
        }

        return () => {
            if (activeConversationId) {
                socketService.leaveConversation(activeConversationId);
            }
        };
    }, [dispatch, activeConversationId, chatAccessed]);

    // Handle search with debouncing
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchInput.trim().length > 0) {
            searchTimeoutRef.current = setTimeout(() => {
                dispatch(searchUsers({ query: searchInput.trim() }));
            }, 300);
        } else {
            dispatch(clearSearchResults());
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [dispatch, searchInput]);

    // Cleanup useEffect for socket disconnection
    useEffect(() => {
        return () => {
            console.log('Chat component unmounting, disconnecting socket...');
            socketService.disconnect();
        };
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleConversationClick = (conversation) => {
        dispatch(setActiveConversation(conversation._id));
        setShowSearch(false);
        dispatch(clearSearchResults());
        setSearchInput('');
    };

    const handleUserClick = async (user) => {
        try {
            await dispatch(startConversation({ targetUserId: user.id })).unwrap();
            setShowSearch(false);
            dispatch(clearSearchResults());
            setSearchInput('');
        } catch (error) {
            console.error('Failed to start conversation:', error);
        }
    };

    const handleRefreshConversations = () => {
        console.log('REFRESHING CONVERSATIONS');
        console.log('CURRENT USER ID', currentUserId);
        if (currentUserId) {
            // Force reload conversations
            setConversationsLoaded(false);
            dispatch(fetchConversations({ limit: 20, page: 1 }));
            setConversationsLoaded(true);
        }
    };

    const handleSendMessage = () => {
        if (!messageInput.trim() || !activeConversation) return;

        // Get receiver ID (the other participant)
        const receiver = activeConversation.participants.find((p) => p.user.id !== currentUserId);
        if (!receiver) return;

        const success = socketService.sendMessage(receiver.user.id, messageInput.trim());
        if (success) {
            setMessageInput('');
            handleStopTyping();
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setMessageInput(value);

        // Handle typing indicators
        if (value.trim() && !isTyping) {
            handleStartTyping();
        } else if (!value.trim() && isTyping) {
            handleStopTyping();
        }
    };

    const handleStartTyping = () => {
        if (!activeConversationId || isTyping) return;

        setIsTyping(true);
        dispatch(setCurrentUserTyping({ isTyping: true, conversationId: activeConversationId }));

        const receiver = activeConversation?.participants.find((p) => p.user.id !== currentUserId);
        if (receiver) {
            socketService.startTyping(activeConversationId, receiver.user.id);
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 3 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            handleStopTyping();
        }, 3000);
    };

    const handleStopTyping = () => {
        if (!isTyping) return;

        setIsTyping(false);
        dispatch(setCurrentUserTyping({ isTyping: false, conversationId: null }));

        const receiver = activeConversation?.participants.find((p) => p.user.id !== currentUserId);
        if (receiver) {
            socketService.stopTyping(activeConversationId, receiver.user.id);
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
    };

    const handleKeyPress = createKeyHandler(
        {
            enter: () => {
                handleSendMessage();
            }
        },
        'Chat'
    );

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else if (diffInHours < 168) {
            // 7 days
            return date.toLocaleDateString('vi-VN', {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };

    const getAvatarContent = (user) => {
        if (user.avatar) {
            return <img src={getMediaUrl(user.avatar)} alt={user.fullName} />;
        }
        const placeholder = getTextPlaceholder(user.fullName || user.name, 32);
        return (
            <div
                style={{
                    backgroundColor: placeholder.backgroundColor,
                    color: placeholder.color,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {placeholder.text}
            </div>
        );
    };

    const getMessageStatus = (message) => {
        if (message.sender.id !== currentUserId) return null;

        if (message.read_at) {
            return { icon: <MdDoneAll />, className: 'read' };
        } else if (message.status === 'delivered') {
            return { icon: <MdDoneAll />, className: 'delivered' };
        } else {
            return { icon: <MdCheck />, className: 'sent' };
        }
    };

    const renderConnectionStatus = () => {
        if (connectionError) {
            return (
                <div className={cx('connection-status', 'error')}>
                    Lỗi kết nối: {connectionError}
                </div>
            );
        } else if (!isConnected) {
            return (
                <div className={cx('connection-status', 'disconnected')}>Đang kết nối lại...</div>
            );
        } else {
            return <div className={cx('connection-status', 'connected')}>Đã kết nối</div>;
        }
    };

    const renderConversationList = () => {
        console.log('=== RENDER CONVERSATION LIST ===');
        console.log('Current user ID:', currentUserId);
        console.log('Conversations from Redux:', conversations);
        console.log('Conversations loading:', conversationsLoading);
        console.log('User profile loaded:', userProfileLoaded);
        console.log('Is authenticated:', isAuthenticated);

        // Show loading state while conversations are being fetched
        if (conversationsLoading) {
            console.log('Showing conversations loading state');
            return (
                <div className={cx('loading-state')}>
                    <div className={cx('spinner')}></div>
                    Đang tải cuộc trò chuyện...
                </div>
            );
        }

        // Show loading state if user is not available yet (only if we don't have conversations yet)
        if (!currentUserId && conversations.length === 0) {
            console.log('Showing user loading state');
            return (
                <div className={cx('loading-state')}>
                    <div className={cx('spinner')}></div>
                    Đang tải thông tin người dùng...
                </div>
            );
        }

        // Show empty state if no conversations exist
        if (conversations.length === 0) {
            console.log('Showing empty state - no conversations');
            return (
                <div className={cx('empty-state')}>
                    <MdChatBubbleOutline className={cx('icon')} />
                    <h3>Chưa có cuộc trò chuyện</h3>
                    <p>Bắt đầu trò chuyện mới bằng cách tìm kiếm người dùng</p>
                </div>
            );
        }

        console.log('Rendering conversations list with', conversations.length, 'conversations');

        return (
            <div className={cx('conversation-list')}>
                {conversations.map((conversation) => {
                    console.log('Rendering conversation:', conversation);
                    console.log('Current user ID:', currentUserId);
                    console.log('Participants:', conversation.participants);

                    // If we don't have currentUserId yet, try to determine it from the conversation
                    // In shop app, we should be the shop user (second participant usually)
                    let effectiveUserId = currentUserId;
                    if (!effectiveUserId && conversation.participants.length >= 2) {
                        // Assume we are the shop user (look for the one with "SHOP" in the name or email)
                        const shopParticipant = conversation.participants.find(
                            (p) => p.user.fullName.includes('SHOP') || p.user.email.includes('shop')
                        );
                        if (shopParticipant) {
                            effectiveUserId = shopParticipant.user.id;
                            console.log('Determined effective user ID:', effectiveUserId);
                        }
                    }

                    const otherParticipant = conversation.participants.find(
                        (p) => p.user.id !== effectiveUserId
                    );

                    console.log('Other participant found:', otherParticipant);
                    console.log('Effective user ID:', effectiveUserId);

                    if (!otherParticipant) {
                        console.log('No other participant found, skipping conversation');
                        return null;
                    }

                    return (
                        <div
                            key={conversation._id}
                            className={cx('conversation-item', {
                                active: conversation._id === activeConversationId
                            })}
                            onClick={() => handleConversationClick(conversation)}
                        >
                            <div className={cx('avatar')}>
                                {getAvatarContent(otherParticipant.user)}
                                {conversation.isOnline && (
                                    <div className={cx('online-indicator')}></div>
                                )}
                            </div>
                            <div className={cx('conversation-info')}>
                                <div className={cx('name')}>{conversation.name}</div>
                                {conversation.lastMessage && (
                                    <div className={cx('last-message')}>
                                        {conversation.lastMessage.sender?.id === effectiveUserId &&
                                            'Bạn: '}
                                        {conversation.lastMessage.content}
                                    </div>
                                )}
                            </div>
                            <div className={cx('conversation-meta')}>
                                {conversation.lastMessage && (
                                    <div className={cx('timestamp')}>
                                        {formatTimestamp(conversation.lastMessage.timestamp)}
                                    </div>
                                )}
                                {conversation.unreadCount > 0 && (
                                    <div className={cx('unread-badge')}>
                                        {conversation.unreadCount}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderSearchResults = () => {
        if (!showSearch || searchInput.length === 0) return null;

        return (
            <div className={cx('search-results')}>
                {searchLoading ? (
                    <div className={cx('loading-state')}>
                        <div className={cx('spinner')}></div>
                        Đang tìm kiếm...
                    </div>
                ) : searchResults.length === 0 ? (
                    <div className={cx('no-results')}>Không tìm thấy người dùng nào</div>
                ) : (
                    searchResults.map((user) => (
                        <div
                            key={user.id}
                            className={cx('search-result-item')}
                            onClick={() => handleUserClick(user)}
                        >
                            <div className={cx('avatar')}>
                                {getAvatarContent(user)}
                                {user.isOnline && <div className={cx('online-indicator')}></div>}
                            </div>
                            <div className={cx('user-info')}>
                                <div className={cx('name')}>{user.fullName}</div>
                                <div className={cx('email')}>{user.email}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        );
    };

    const renderMessages = () => {
        if (!activeConversation) {
            return (
                <div className={cx('empty-state')}>
                    <MdChatBubbleOutline className={cx('icon')} />
                    <h3>Chọn một cuộc trò chuyện</h3>
                    <p>Chọn cuộc trò chuyện từ danh sách bên trái để bắt đầu nhắn tin</p>
                </div>
            );
        }

        if (messagesLoading) {
            return (
                <div className={cx('loading-state')}>
                    <div className={cx('spinner')}></div>
                    Đang tải tin nhắn...
                </div>
            );
        }

        return (
            <div className={cx('messages-container')}>
                {messages.map((message) => {
                    const isOwn = message.sender.id === currentUserId;
                    const status = getMessageStatus(message);

                    return (
                        <div key={message._id} className={cx('message', { own: isOwn })}>
                            {!isOwn && (
                                <div className={cx('avatar')}>
                                    {getAvatarContent(message.sender)}
                                </div>
                            )}
                            <div className={cx('message-bubble')}>
                                <div className={cx('message-content')}>{message.content}</div>
                                <div className={cx('message-info')}>
                                    <span className={cx('timestamp')}>
                                        {formatTimestamp(message.timestamp)}
                                    </span>
                                    {status && (
                                        <span className={cx('status', status.className)}>
                                            {status.icon}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {typingUsers.length > 0 && (
                    <div className={cx('typing-indicator')}>
                        <div className={cx('avatar')}>{getAvatarContent(typingUsers[0].user)}</div>
                        <span>{typingUsers[0].user.fullName} đang nhập...</span>
                        <div className={cx('dots')}>
                            <div className={cx('dot')}></div>
                            <div className={cx('dot')}></div>
                            <div className={cx('dot')}></div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>
        );
    };

    const renderChatHeader = () => {
        if (!activeConversation) return null;

        const otherParticipant = activeConversation.participants.find(
            (p) => p.user.id !== currentUserId
        );

        if (!otherParticipant) return null;

        return (
            <div className={cx('chat-header')}>
                <div className={cx('avatar')}>
                    {getAvatarContent(otherParticipant.user)}
                    {activeConversation.isOnline && <div className={cx('online-indicator')}></div>}
                </div>
                <div className={cx('user-info')}>
                    <div className={cx('name')}>{otherParticipant.user.fullName}</div>
                    <div className={cx('status', { offline: !activeConversation.isOnline })}>
                        {activeConversation.isOnline ? 'Đang trực tuyến' : 'Ngoại tuyến'}
                    </div>
                </div>
                <div className={cx('chat-actions')}>
                    <button title="Gọi điện">
                        <MdPhone />
                    </button>
                    <button title="Video call">
                        <MdVideoCall />
                    </button>
                    <button title="Tùy chọn">
                        <MdMoreVert />
                    </button>
                </div>
            </div>
        );
    };

    const renderMessageInput = () => {
        if (!activeConversation) return null;

        return (
            <div className={cx('message-input-container')}>
                <div className={cx('message-input')}>
                    <textarea
                        ref={messageInputRef}
                        value={messageInput}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        placeholder="Nhập tin nhắn..."
                        rows="1"
                        style={{
                            height: 'auto',
                            minHeight: '24px',
                            maxHeight: '120px'
                        }}
                        onInput={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                    />
                    <div className={cx('input-actions')}>
                        <button title="Đính kèm tệp">
                            <MdAttachFile />
                        </button>
                        <button title="Emoji">
                            <MdEmojiEmotions />
                        </button>
                        <button
                            className={cx('send-btn')}
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim()}
                            title="Gửi"
                        >
                            <MdSend />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={cx('chat-container')}>
            {/* Sidebar */}
            <div className={cx('sidebar')}>
                {renderConnectionStatus()}

                <div className={cx('sidebar-header')}>
                    <div className={cx('header-top')}>
                        <h2 className={cx('sidebar-title')}>Tin nhắn</h2>

                        <button
                            className={cx('refresh-btn')}
                            onClick={handleRefreshConversations}
                            disabled={conversationsLoading || !currentUserId}
                            title="Làm mới cuộc trò chuyện"
                        >
                            <MdRefresh className={cx('icon', { spinning: conversationsLoading })} />
                        </button>
                    </div>

                    <div className={cx('search-box')}>
                        <input
                            type="text"
                            placeholder="Tìm kiếm người dùng..."
                            value={searchInput}
                            onChange={(e) => {
                                setSearchInput(e.target.value);
                                setShowSearch(true);
                            }}
                            onFocus={() => setShowSearch(true)}
                            disabled={!currentUserId}
                        />
                        <MdSearch className={cx('search-icon')} />
                        {renderSearchResults()}
                    </div>

                    <button
                        className={cx('new-chat-btn')}
                        onClick={() => setShowSearch(true)}
                        disabled={!currentUserId}
                    >
                        <MdAdd className={cx('icon')} />
                        Cuộc trò chuyện mới
                    </button>
                </div>

                {renderConversationList()}
            </div>

            {/* Main Content */}
            <div className={cx('main-content')}>
                {renderChatHeader()}
                {renderMessages()}
                {renderMessageInput()}
            </div>
        </div>
    );
}

export default Chat;
