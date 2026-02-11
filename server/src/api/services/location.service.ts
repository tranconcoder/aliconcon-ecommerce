import {
    findDistrict,
    findWard,
    findOneDistrict,
    findOneWard,
    findOneProvince,
    findProvince,
    findOneLocation,
    findLocationById,
    deleteLocationById
} from '@/models/repository/location/index.js';
import { provinceModel, districtModel, wardModel, locationModel } from '@/models/location.model.js';
import { BadRequestErrorResponse } from '@/response/error.response.js';
import { Geocode } from './openrouteservice.service';

export default new (class LocationService {
    /* ---------------------------------------------------------- */
    /*                           Create                           */
    /* ---------------------------------------------------------- */
    async createLocation({
        provinceId,
        districtId,
        wardId,
        address
    }: service.location.CreateLocation) {
        /* ---------------------- Check exists ---------------------- */
        const province = await provinceModel.findOne({ _id: provinceId }).lean();
        if (!province) throw new BadRequestErrorResponse({ message: 'Province is invalid!' });

        const district = await districtModel.findOne({ _id: districtId }).lean();
        if (!district) throw new BadRequestErrorResponse({ message: 'District is invalid!' });

        const ward = !wardId || (await wardModel.findOne({ _id: wardId }).lean());
        if (!ward) throw new BadRequestErrorResponse({ message: 'Ward is invalid!' });

        /* ----------------- Handle create location ----------------- */
        const wardText = typeof ward === 'boolean' ? ',' : ward.ward_name + ', ';
        const locationText = `${address}, ${wardText}${district.district_name}, ${province.province_name}`;
        let locationTextTemp = locationText;

        /* --------------------- Get coordinates -------------------- */
        let coordinates: number[] | undefined;
        do {
            console.log('Location text:', locationTextTemp);

            let response = await Geocode.geocode({
                text: locationTextTemp,
                boundary_country: ['VN']
            });

            coordinates = response?.features?.at(0)?.geometry?.coordinates;
            if (!coordinates)
                locationTextTemp = locationTextTemp.split(', ').slice(1).join(', ');
        } while (!coordinates || locationTextTemp.split(', ').length == 1);
        if (!coordinates) throw new BadRequestErrorResponse({ message: 'Get coordinates failed!' });

        const saved = await locationModel.create({
            province: provinceId,
            district: districtId,
            ward: wardId,
            address,
            text: locationText,
            coordinates: {
                x: coordinates[0],
                y: coordinates[1]
            }
        });

        if (!saved) throw new BadRequestErrorResponse({ message: 'Create location failed!' });

        return saved;
    }

    /* ---------------------------------------------------------- */
    /*                          Get all                           */
    /* ---------------------------------------------------------- */

    /* -------------------- Get all province -------------------- */
    async getAllProvince() {
        return await findProvince({ query: {}, omit: 'metadata' });
    }

    /* ---------------------- Get all district ---------------------- */
    async getAllDistrict() {
        return await findDistrict({ query: {}, omit: 'metadata' });
    }

    /* -------------------- Get all ward -------------------- */
    async getAllWard() {
        return await findWard({ query: {}, omit: 'metadata' });
    }

    /* ---------------------------------------------------------- */
    /*                         Get by id                          */
    /* ---------------------------------------------------------- */
    async getProvinceById(id: string) {
        return await findOneProvince({
            query: { _id: id },
            omit: 'metadata'
        });
    }
    async getDistrictById(id: string) {
        return await findOneDistrict({
            query: { _id: id },
            omit: 'metadata'
        });
    }
    async getWardById(id: string) {
        return await findOneWard({
            query: { _id: id },
            omit: 'metadata'
        });
    }

    async getLocationById(id: string) {
        const location = await findLocationById({
            id,
            options: {
                lean: true,
                populate: {
                    path: 'province district ward',
                    select: ['_id', 'province_name', 'district_name', 'ward_name']
                }
            },
            omit: ['text', 'ward', 'address']
        });
        if (!location) throw new BadRequestErrorResponse({ message: 'Location not found!' });

        return location;
    }

    async getLocationTextById(id: string) {
        const location = await findOneLocation({
            query: { _id: id },
            only: ['text'],
            options: { lean: true }
        });
        if (!location) throw new BadRequestErrorResponse({ message: 'Location not found!' });
        return location.text;
    }

    /* ---------------------------------------------------------- */
    /*                         Get by name                        */
    /* ---------------------------------------------------------- */

    /* ------------------ Get province by name ------------------ */
    async getProvinceByName(name: string) {
        return await findOneProvince({
            query: { province_slug: name },
            omit: 'metadata'
        });
    }
    /* -------------------- Get district by name -------------------- */
    async getDistrictByName(name: string) {
        return await findOneDistrict({
            query: { district_slug: name },
            omit: 'metadata'
        });
    }
    /* ------------------ Get ward by name ------------------ */
    async getWardByName(name: string) {
        return await findOneWard({
            query: { ward_slug: name },
            omit: 'metadata'
        });
    }

    /* ---------------------------------------------------------- */
    /*                         Get with                          */
    /* ---------------------------------------------------------- */

    /* ----------------- Get province with district ----------------- */
    async getProvinceWithDistrict(districtId: string) {
        return await findOneDistrict({
            query: { _id: districtId },
            only: ['province', 'district_name', 'district_type', 'district_slug']
        }).populate('province');
    }

    /* --------------- Get province with ward --------------- */
    async getProvinceWithWard(wardId: string) {
        return await findOneWard({
            query: { _id: wardId },
            only: ['province', 'ward_name', 'ward_type', 'ward_slug']
        }).populate('province');
    }

    /* ----------------- Get district with ward ----------------- */
    async getDistrictWithWard(wardId: string) {
        return await findOneWard({
            query: { _id: wardId },
            only: ['district', 'ward_name', 'ward_type', 'ward_slug']
        }).populate('district');
    }

    /* ---------------------------------------------------------- */
    /*                         Get child                          */
    /* ---------------------------------------------------------- */

    /* --------------- Get all districts in province --------------- */
    async getAllDistrictsInProvince(provinceId: string) {
        return await findDistrict({
            query: { province: provinceId },
            omit: 'metadata'
        });
    }

    /* ------------- Get all wards in province  ------------- */
    async getAllWardsInProvince(provinceId: string) {
        return await findWard({
            query: { province: provinceId },
            omit: 'metadata'
        });
    }

    /* --------------- Get all wards in district  --------------- */
    async getAllWardsInDistrict(districtId: string) {
        return await findWard({
            query: { district: districtId },
            omit: 'metadata'
        });
    }

    /* ---------------------------------------------------------- */
    /*                           Update                           */
    /* ---------------------------------------------------------- */

    /* ---------------- Update coordinates by id ---------------- */
    async updateCoordinatesById(id: string, coordinates: { x: number; y: number }) {
        const location = await findLocationById({ id });
        if (!location) throw new BadRequestErrorResponse({ message: 'Location not found!' });

        location.coordinates = coordinates;

        const updated = await location.save();
        if (!updated) throw new BadRequestErrorResponse({ message: 'Update coordinates failed!' });

        return updated;
    }

    /* ---------------------------------------------------------- */
    /*                           Delete                           */
    /* ---------------------------------------------------------- */
    async deleteLocation(locationId: string) {
        try {
            const deletedLocation = await deleteLocationById({ id: locationId });
            return !!deletedLocation;
        } catch (error) {
            console.warn('⚠️ [LOCATION SERVICE] Failed to delete location:', locationId, error);
            return false;
        }
    }
})();
