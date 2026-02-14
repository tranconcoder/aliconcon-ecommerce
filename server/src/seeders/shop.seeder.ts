
import shopModel from '@/models/shop.model.js';
import { ShopStatus, ShopType } from '@/enums/shop.enum.js';
import mongoose from 'mongoose';
import { userSeeder } from './user.seeder.js';
import { locationModel, districtModel, provinceModel, wardModel } from '@/models/location.model.js';

const SHOP_ID = '000000000000000000000001';

export const initShop = async () => {
    // Find a location to link
    const province = await provinceModel.findOne({ province_name: 'Thành phố Hồ Chí Minh' });
    const district = await districtModel.findOne({ district_name: 'Quận 1', province: province?._id });
    const ward = await wardModel.findOne({ ward_name: 'Phường Bến Nghé', district: district?._id });

    if (!province || !district || !ward) {
        console.error('❌ Location data not found for Shop seeder');
        return;
    }

    const location = await locationModel.findOneAndUpdate(
        { 
            province: province._id,
            district: district._id,
            ward: ward._id,
            address: '123 Đường Lê Lợi' 
        },
        {
            province: province._id,
            district: district._id,
            ward: ward._id,
            address: '123 Đường Lê Lợi',
            text: '123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh'
        },
        { upsert: true, new: true }
    );

    const shopData = {
        _id: new mongoose.Types.ObjectId(SHOP_ID),
        shop_userId: userSeeder._id,
        shop_name: 'Aliconcon Official Store',
        shop_email: 'shop@aliconcon.com',
        shop_type: ShopType.COMPANY,
        shop_certificate: 'CERT-123456',
        shop_location: location._id,
        shop_phoneNumber: '0987654321',
        shop_description: 'Official store for Aliconcon products',
        
        shop_owner_fullName: userSeeder.user_fullName,
        shop_owner_email: userSeeder.user_email,
        shop_owner_phoneNumber: userSeeder.phoneNumber,
        shop_owner_cardID: '123456789',

        shop_status: ShopStatus.ACTIVE,
        is_brand: true
    };

    await shopModel.findOneAndUpdate(
        { _id: shopData._id },
        shopData,
        { upsert: true, new: true }
    );
};
