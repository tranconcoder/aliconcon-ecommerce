import apiClient from '../axios.service';

export interface Address {
    _id: string;
    user: string;
    recipient_name: string;
    recipient_phone: string;
    location: {
        _id: string;
        address: string;
        text: string;
        province: {
            _id: string;
            province_name: string;
            province_type: string;
        };
        district: {
            _id: string;
            district_name: string;
            district_type: string;
        };
        ward?: {
            _id: string;
            ward_name: string;
            ward_type: string;
        };
    };
    address_label?: string;
    is_default: boolean;
    is_active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAddressPayload {
    recipient_name: string;
    recipient_phone: string;
    location: string;
    address_label?: string;
    is_default?: boolean;
}

export interface UpdateAddressPayload {
    recipient_name?: string;
    recipient_phone?: string;
    location?: string;
    address_label?: string;
    is_default?: boolean;
}

export interface AddressResponse {
    message: string;
    metadata: Address;
}

export interface AddressListResponse {
    message: string;
    metadata: Address[];
}

class AddressService {
    /**
     * Get all user addresses
     */
    async getUserAddresses(): Promise<Address[]> {
        const response = await apiClient.get<AddressListResponse>('/address');
        return response.data.metadata;
    }

    /**
     * Get default address
     */
    async getDefaultAddress(): Promise<Address | null> {
        try {
            const response = await apiClient.get<AddressResponse>('/address/default');
            return response.data.metadata;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Create new address
     */
    async createAddress(payload: CreateAddressPayload): Promise<Address> {
        const response = await apiClient.post<AddressResponse>('/address', payload);
        return response.data.metadata;
    }

    /**
     * Update address
     */
    async updateAddress(addressId: string, payload: UpdateAddressPayload): Promise<Address> {
        const response = await apiClient.patch<AddressResponse>(`/address/${addressId}`, payload);
        return response.data.metadata;
    }

    /**
     * Set address as default
     */
    async setDefaultAddress(addressId: string): Promise<Address> {
        const response = await apiClient.patch<AddressResponse>(`/address/${addressId}/default`);
        return response.data.metadata;
    }

    /**
     * Delete address
     */
    async deleteAddress(addressId: string): Promise<Address> {
        const response = await apiClient.delete<AddressResponse>(`/address/${addressId}`);
        return response.data.metadata;
    }
}

const addressService = new AddressService();
export default addressService; 