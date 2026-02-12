import apiClient from '../axios.service';

export interface Province {
    _id: string;
    province_name: string;
    province_type: string;
    province_slug: string;
    createdAt: string;
    updatedAt: string;
}

export interface District {
    _id: string;
    province: string;
    district_name: string;
    district_type: string;
    district_slug: string;
    createdAt: string;
    updatedAt: string;
}

export interface Ward {
    _id: string;
    province: string;
    district: string;
    ward_name: string;
    ward_type: string;
    ward_slug: string;
    createdAt: string;
    updatedAt: string;
}

export interface Location {
    _id: string;
    province: string;
    district: string;
    ward?: string;
    address: string;
    text: string;
    coordinates?: {
        x: number;
        y: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CreateLocationPayload {
    provinceId: string;
    districtId: string;
    wardId?: string;
    address: string;
}

export interface LocationResponse {
    message: string;
    metadata: Location;
}

export interface LocationListResponse {
    message: string;
    metadata: Location[];
}

export interface ProvinceListResponse {
    message: string;
    metadata: Province[];
}

export interface DistrictListResponse {
    message: string;
    metadata: District[];
}

export interface WardListResponse {
    message: string;
    metadata: Ward[];
}

class LocationService {
    /**
     * Get all provinces
     */
    async getProvinces(): Promise<Province[]> {
        const response = await apiClient.get<ProvinceListResponse>('/location/province');
        return response.data.metadata;
    }

    /**
     * Get districts by province
     */
    async getDistricts(provinceId: string): Promise<District[]> {
        const response = await apiClient.get<DistrictListResponse>(`/location/district/province/${provinceId}`);
        return response.data.metadata;
    }

    /**
     * Get wards by district
     */
    async getWards(districtId: string): Promise<Ward[]> {
        const response = await apiClient.get<WardListResponse>(`/location/ward/district/${districtId}`);
        return response.data.metadata;
    }

    /**
     * Create new location
     */
    async createLocation(payload: CreateLocationPayload): Promise<Location> {
        const response = await apiClient.post<LocationResponse>('/location', payload);
        return response.data.metadata;
    }
}

const locationService = new LocationService();
export default locationService; 