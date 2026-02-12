import apiClient from '../axios.service';

export interface ChatUser {
    id: string;
    fullName: string;
    email: string;
    avatar?: string;
    phoneNumber?: string;
    isOnline?: boolean;
}

export interface ChatMessage {
    _id: string;
    content: string;
    type: 'text' | 'image' | 'file';
    sender: ChatUser;
    receiver: ChatUser;
    status: 'sent' | 'delivered' | 'read';
    media?: {
        id: string;
        fileName: string;
        filePath: string;
        mimeType: string;
    };
    metadata?: any;
    timestamp: string;
    read_at?: string;
}

export interface ChatParticipant {
    user: ChatUser;
    joined_at: string;
    last_read_at: string;
    unread_count: number;
}

export interface ChatConversation {
    _id: string;
    type: 'direct' | 'group' | 'support';
    name?: string;
    participants: ChatParticipant[];
    lastMessage?: {
        content: string;
        type: string;
        timestamp: string;
        sender: ChatUser;
    };
    messageCount: number;
    unreadCount: number;
    status: 'active' | 'archived' | 'blocked';
    updated_at: string;
    isOnline?: boolean;
}

export interface ConversationsResponse {
    conversations: ChatConversation[];
    pagination: {
        page: number;
        limit: number;
        hasMore: boolean;
    };
}

export interface MessagesResponse {
    messages: ChatMessage[];
    pagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
        hasMore: boolean;
    };
    conversationInfo: {
        _id: string;
        type: string;
        name?: string;
        messageCount: number;
        status: string;
    };
}

export interface StartConversationResponse {
    conversation: {
        _id: string;
        type: string;
        participants: ChatUser[];
        messageCount: number;
        status: string;
        created_at: string;
        isOnline: boolean;
    };
}

export interface SearchUsersResponse {
    users: ChatUser[];
    query: string;
}

export interface OnlineUsersResponse {
    users: ChatUser[];
    count: number;
}

const chatService = {
    /**
     * Get user conversations
     */
    async getConversations(limit = 20, page = 1): Promise<ConversationsResponse> {
        try {
            const response = await apiClient.get('/chat/conversations', {
                params: { limit, page }
            });
            return response.data.metadata;
        } catch (error) {
            console.error('Get conversations error:', error);
            throw error;
        }
    },

    /**
     * Get messages from a conversation
     */
    async getMessages(conversationId: string, limit = 100, page = 1): Promise<MessagesResponse> {
        try {
            const response = await apiClient.get(`/chat/conversations/${conversationId}/messages`, {
                params: { limit, page }
            });
            return response.data.metadata;
        } catch (error) {
            console.error('Get messages error:', error);
            throw error;
        }
    },

    /**
     * Start a new conversation with a user
     */
    async startConversation(targetUserId: string): Promise<StartConversationResponse> {
        try {
            const response = await apiClient.post('/chat/conversations', {
                targetUserId
            });
            return response.data.metadata;
        } catch (error) {
            console.error('Start conversation error:', error);
            throw error;
        }
    },

    /**
     * Search users for starting conversations
     */
    async searchUsers(query: string, limit = 10): Promise<SearchUsersResponse> {
        try {
            const response = await apiClient.get('/chat/users/search', {
                params: { q: query, limit }
            });
            return response.data.metadata;
        } catch (error) {
            console.error('Search users error:', error);
            throw error;
        }
    },

    /**
     * Get online users
     */
    async getOnlineUsers(): Promise<OnlineUsersResponse> {
        try {
            const response = await apiClient.get('/chat/users/online');
            return response.data.metadata;
        } catch (error) {
            console.error('Get online users error:', error);
            throw error;
        }
    }
};

export default chatService; 