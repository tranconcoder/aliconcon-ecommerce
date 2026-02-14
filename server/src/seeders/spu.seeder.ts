/**
 * @file spu.seeder.ts
 * @description Seeder for Master Products (SPUs) and their associated media assets.
 */

import { spuModel } from '@/models/spu.model.js';
import shopModel from '@/models/shop.model.js';
import mediaModel from '@/models/media.model.js';
import mongoose from 'mongoose';
import { ShopStatus } from '@/enums/shop.enum.js';
import { MediaTypes, MediaMimeTypes } from '@/enums/media.enum.js';
import { SPU_BASE_PATH } from '@/configs/media.config.js';
import { seederDataManager } from './data/index.js';
import type { ISPUData } from './data/spu.data.js';
import { Seeder } from './seeder.js';

/* ---------------------------------------------------------- */
/*                         Constants                          */
/* ---------------------------------------------------------- */

/** Default base ID for category inheritance suffixing */
const baseCategoryId = '0000000000000000000000';

/* ---------------------------------------------------------- */
/*                        SPU Seeder                          */
/* ---------------------------------------------------------- */

/**
 * Seeder implementation for Standard Product Units (SPUs).
 * Orchestrates the creation of product images in the media library 
 * and the definition of the product themselves.
 */
class SPUSeeder extends Seeder {
    private products: ISPUData[] = [];
    private shop: any = null;

    constructor() {
        super('SPU');
    }

    /**
     * @description Loads product templates and identifies an active shop to own them.
     * @override
     * @returns {Promise<void>}
     */
    protected async prepare(): Promise<void> {
        this.products = seederDataManager.table<ISPUData>('spus')?.getAll() || [];
        this.shop = await shopModel.findOne({ shop_status: ShopStatus.ACTIVE });
    }

    /**
     * @description Verifies that the environment is ready for product seeding.
     * @override
     * @returns {Promise<void>}
     */
    protected async validate(): Promise<void> {
        if (!this.shop) throw new Error('No active shop found — SPU seeder requires at least one active shop');
        if (!this.products.length) throw new Error('No SPU data found');
    }

    /**
     * @description Executes the combined media and product seeding process.
     * @override
     * @returns {Promise<void>}
     */
    protected async seed(): Promise<void> {
        // Clear existing data to handle predefined ID changes and avoid slug duplicates
        await spuModel.deleteMany({});
        console.log('[SPU Seeder] Cleared existing SPU records');

        for (const p of this.products) {
            // Step 1: Identify all unique images across main product and its variations
            const allImages = new Set<string>();
            allImages.add(p.image);
            p.variations.forEach(v => {
                if (v.images) v.images.forEach(img => allImages.add(img));
            });

            // Step 2: Ensure all identified images exist in the media collection
            const mediaMap = new Map<string, any>();
            for (const imgName of allImages) {
                let media = await mediaModel.findOne({ media_fileName: imgName });
                if (!media) {
                    media = await mediaModel.create({
                        media_title: p.name,
                        media_fileName: imgName,
                        media_filePath: `${SPU_BASE_PATH}/${imgName}`,
                        media_fileType: MediaTypes.IMAGE,
                        media_mimeType: MediaMimeTypes.IMAGE_PNG,
                        media_fileSize: 1024 * 1024,
                        media_isFolder: false,
                        media_owner: this.shop.shop_userId
                    });
                }
                mediaMap.set(imgName, media);
            }

            // Step 3: Resolve specific asset and category references
            const mainMedia = mediaMap.get(p.image);
            const categoryId = new mongoose.Types.ObjectId(baseCategoryId + p.categorySuffix);

            // Step 4: Construct the SPU document
            const spuData = {
                _id: p._id,
                product_name: p.name,
                product_thumb: mainMedia._id,
                product_description: p.desc,
                product_price: p.price,
                product_category: categoryId,
                product_shop: this.shop._id,
                product_attributes: p.attrs.map(attr => ({
                    attr_id: new mongoose.Types.ObjectId(),
                    attr_name: attr.attr_name,
                    attr_value: attr.attr_value
                })),
                product_variations: p.variations.map(variation => {
                    // Fallback to main image if variation-specific images aren't defined
                    const variationImages = variation.images && variation.images.length > 0
                        ? variation.images
                        : variation.values.map(() => p.image);

                    const imageIds = variationImages.map(imgName => {
                        const media = mediaMap.get(imgName);
                        return media ? media._id : mainMedia._id;
                    });

                    return {
                        variation_id: new mongoose.Types.ObjectId(),
                        variation_name: variation.name,
                        variation_values: variation.values,
                        variation_images: imageIds
                    };
                }),
                product_quantity: 100,
                product_slug: p.slug,
                is_publish: true,
                is_draft: false,
                product_images: [mainMedia._id]
            };

            // Step 5: Upsert the SPU record by ID or slug
            await spuModel.findOneAndUpdate(
                { _id: p._id },
                spuData,
                { upsert: true, new: true }
            );
        }
    }
}

// Export a singleton instance
export const spuSeeder = new SPUSeeder();
