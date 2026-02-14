/**
 * @file shop.seeder.ts
 * @description Seeder for initializing shops, their logos, and spatial locations.
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import shopModel from '@/models/shop.model.js';
import mediaModel from '@/models/media.model.js';
import { locationModel, districtModel, provinceModel, wardModel } from '@/models/location.model.js';
import { SHOP_INIT_BASE_PATH } from '@/configs/media.config.js';
import { MediaMimeTypes, MediaTypes } from '@/enums/media.enum.js';
import { seederDataManager } from './data/index.js';
import type { IShopData } from './data/shop.data.js';
import { Seeder } from './seeder.js';

/* ---------------------------------------------------------- */
/*                        Constants                           */
/* ---------------------------------------------------------- */

/** Directory where shop logos will be served from at runtime */
const SHOP_LOGO_PUBLIC = path.join(import.meta.dirname, '../../../public/shops');

/* ---------------------------------------------------------- */
/*                        Shop Seeder                         */
/* ---------------------------------------------------------- */

/**
 * Seeder implementation for shops.
 * Handles multi-step seeding:
 *   1. Create media records for shop logos
 *   2. Copy logo images to public directory
 *   3. Resolve geographic locations
 *   4. Upsert shop records linking to media and location
 */
class ShopSeeder extends Seeder {
    private shops: IShopData[] = [];

    constructor() {
        super('Shop');
    }

    /**
     * @description Retrieves the shop definitions from the manager.
     * @override
     * @returns {Promise<void>}
     */
    protected async prepare(): Promise<void> {
        this.shops = seederDataManager.table<IShopData>('shops')?.getAll() || [];
    }

    /**
     * @description Verifies that the prerequisite location data has been seeded.
     * @override
     * @returns {Promise<void>}
     */
    protected async validate(): Promise<void> {
        if (!this.shops.length) throw new Error('No shop data found');

        // Check for required provinces for each shop
        for (const s of this.shops) {
            const province = await provinceModel.findOne({ province_name: s.provinceName });
            if (!province) {
                console.warn(`    ⚠ Province "${s.provinceName}" not found — shop "${s.shop_name}" may fail`);
            }
        }
    }

    /**
     * @description Executes the seeding process in sub-steps (Seed Logo -> Resolve Location -> Upsert Shop).
     * @override
     * @returns {Promise<void>}
     */
    protected async seed(): Promise<void> {
        // Ensure public directory exists
        fs.mkdirSync(SHOP_LOGO_PUBLIC, { recursive: true });

        for (const s of this.shops) {
            // --- Step 1: Seed shop logo media ---
            const logoMediaId = await this.seedShopLogo(s);

            // --- Step 2: Resolve geographic location ---
            const locationId = await this.resolveLocation(s);
            if (!locationId) continue;

            // --- Step 3: Upsert shop record ---
            const shopPayload = {
                _id: new mongoose.Types.ObjectId(s._id),
                shop_userId: new mongoose.Types.ObjectId(s.shop_userId),
                shop_name: s.shop_name,
                shop_logo: logoMediaId,
                shop_email: s.shop_email,
                shop_type: s.shop_type,
                shop_certificate: s.shop_certificate,
                shop_location: locationId,
                shop_phoneNumber: s.shop_phoneNumber,
                shop_description: s.shop_description,
                shop_owner_cardID: s.shop_owner_cardID,
                shop_status: s.shop_status,
                is_brand: s.is_brand
            };

            await shopModel.findOneAndUpdate(
                { _id: shopPayload._id },
                shopPayload,
                { upsert: true, new: true }
            );

            console.log(`    ✓ Shop: ${s.shop_name}`);
        }
    }

    /* ---------------------------------------------------------- */
    /*                     Seed Shop Logo                         */
    /* ---------------------------------------------------------- */

    /**
     * @description Creates a media record for the shop logo and copies the image
     * from seed assets to the public directory.
     * @param {IShopData} shop - The shop data containing logo file info.
     * @returns {Promise<mongoose.Types.ObjectId | undefined>} The ObjectId of the created media record, or undefined if no logo.
     */
    private async seedShopLogo(shop: IShopData): Promise<mongoose.Types.ObjectId | undefined> {
        if (!shop.shop_logo) return undefined;

        const srcPath = path.join(SHOP_INIT_BASE_PATH, shop.shop_logo);
        const destPath = path.join(SHOP_LOGO_PUBLIC, shop.shop_logo);

        // Copy image file to public directory
        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`    ✓ Logo copied: ${shop.shop_logo}`);
        } else {
            console.warn(`    ⚠ Logo file not found: ${srcPath}`);
        }

        // Get file size for media record
        const fileSize = fs.existsSync(destPath)
            ? fs.statSync(destPath).size
            : 0;

        // Determine MIME type from extension
        const ext = path.extname(shop.shop_logo).toLowerCase();
        const mimeType = ext === '.png' ? MediaMimeTypes.IMAGE_PNG : MediaMimeTypes.IMAGE_JPEG;

        // Create media record
        const media = await mediaModel.findOneAndUpdate(
            { media_fileName: shop.shop_logo, media_title: `${shop.shop_name} Logo` },
            {
                media_title: `${shop.shop_name} Logo`,
                media_fileName: shop.shop_logo,
                media_filePath: `${SHOP_LOGO_PUBLIC}/${shop.shop_logo}`,
                media_fileType: MediaTypes.IMAGE,
                media_fileSize: fileSize,
                media_mimeType: mimeType,
                media_desc: `Shop logo for ${shop.shop_name}`,
                media_isFolder: false
            },
            { upsert: true, new: true }
        );

        console.log(`    ✓ Media: ${shop.shop_name} Logo`);
        return media._id as mongoose.Types.ObjectId;
    }

    /* ---------------------------------------------------------- */
    /*                     Resolve Location                       */
    /* ---------------------------------------------------------- */

    /**
     * @description Resolves province/district/ward names to a location record.
     * @param {IShopData} shop - The shop data containing location names.
     * @returns {Promise<mongoose.Types.ObjectId | null>} The ObjectId of the location, or null if resolution fails.
     */
    private async resolveLocation(shop: IShopData): Promise<mongoose.Types.ObjectId | null> {
        const province = await provinceModel.findOne({ province_name: shop.provinceName });
        const district = await districtModel.findOne({ district_name: shop.districtName, province: province?._id });
        const ward = await wardModel.findOne({ ward_name: shop.wardName, district: district?._id });

        if (!province || !district || !ward) {
            console.error(`    ❌ Location not found for shop: ${shop.shop_name}`);
            return null;
        }

        const location = await locationModel.findOneAndUpdate(
            { province: province._id, district: district._id, ward: ward._id, address: shop.address },
            {
                province: province._id,
                district: district._id,
                ward: ward._id,
                address: shop.address,
                text: `${shop.address}, ${shop.wardName}, ${shop.districtName}, ${shop.provinceName}`
            },
            { upsert: true, new: true }
        );

        return new mongoose.Types.ObjectId(location._id);
    }
}

// Export a singleton instance
export const shopSeeder = new ShopSeeder();
