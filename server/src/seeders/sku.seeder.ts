/**
 * @file sku.seeder.ts
 * @description Seeder for Stock Keeping Units (SKUs). Generates dynamic SKUs based on SPU variations.
 */

import skuModel from '@/models/sku.model.js';
import { spuModel } from '@/models/spu.model.js';
import mediaModel from '@/models/media.model.js';
import inventoryModel from '@/models/inventory.model.js';
import warehouseModel from '@/models/warehouse.model.js';
import { seederDataManager } from './data/index.js';
import type { ISKUData } from './data/sku.data.js';
import { Seeder } from './seeder.js';

/* ---------------------------------------------------------- */
/*                         Helpers                            */
/* ---------------------------------------------------------- */

/**
 * Computes the Cartesian product of multiple arrays.
 * Used to generate all possible combinations of variation values.
 */
const cartesian = (...args: any[][]): any[][] => {
    if (args.length === 0) return [];
    if (args.length === 1) return args[0].map(item => [item]);
    return args.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
};

/**
 * Common logic to create or update an SKU record.
 */
const createOrUpdateSKU = async (spuId: any, tierIdx: number[], data: any) => {
    let sku;
    const existingSku = await skuModel.findOne({
        sku_product: spuId,
        sku_tier_idx: tierIdx
    });
    if (!existingSku) {
        sku = await skuModel.create(data);
    } else {
        await skuModel.updateOne({ _id: existingSku._id }, data);
        sku = await skuModel.findById(existingSku._id);
    }

    if (sku) {
        // Create matching inventory record
        const spu = await spuModel.findById(spuId);
        const warehouse = await warehouseModel.findOne({ shop: spu?.product_shop });

        if (warehouse) {
            await inventoryModel.findOneAndUpdate(
                { inventory_sku: sku._id, inventory_shop: spu?.product_shop },
                {
                    inventory_sku: sku._id,
                    inventory_shop: spu?.product_shop,
                    inventory_warehouses: warehouse._id,
                    inventory_stock: data.sku_stock
                },
                { upsert: true, new: true }
            );
        }
    }
};

/* ---------------------------------------------------------- */
/*                        SKU Seeder                          */
/* ---------------------------------------------------------- */

/**
 * Seeder implementation for Stock Keeping Units (SKUs).
 * This seeder is dynamic: it iterates through all existing SPUs, 
 * calculates all variation combinations, applies price rules, 
 * and generates corresponding SKU records.
 */
class SKUSeeder extends Seeder {
    private spus: any[] = [];
    private skuData: any[] = [];

    constructor() {
        super('SKU');
    }

    /**
     * @description Retrieves all standard product units (SPUs) from the database.
     * @override
     * @returns {Promise<void>}
     */
    protected async prepare(): Promise<void> {
        this.spus = await spuModel.find({});
        this.skuData = seederDataManager.table<ISKUData>('skus')?.getAll() || [];
    }

    /**
     * @description Verifies that SPUs exist before attempting to generate SKUs.
     * @override
     * @returns {Promise<void>}
     */
    protected async validate(): Promise<void> {
        if (!this.spus.length) throw new Error('No SPU records found — run SPU seeder first');
    }

    /**
     * @description Iterates through SPUs to generate and upsert SKU combinations.
     * @override
     * @returns {Promise<void>}
     */
    protected async seed(): Promise<void> {
        // Clear existing data to ensure fresh SKU generation
        await skuModel.deleteMany({});
        console.log('[SKU Seeder] Cleared existing SKU records');

        for (const spu of this.spus) {
            // Check if there are predefined SKUs for this SPU (by slug)
            const predefinedSkus = this.skuData.filter(s => s.productSlug === spu.product_slug);

            if (predefinedSkus.length > 0) {
                // Step 0: Seed predefined SKUs
                for (const pre of predefinedSkus) {
                    // Resolve thumb and images ObjectIDs
                    const thumbMedia = await mediaModel.findOne({ media_fileName: pre.thumb });
                    const imageMedias = await mediaModel.find({ media_fileName: { $in: pre.images } });
                    const imageIds = imageMedias.map(m => m._id);

                    if (!thumbMedia) {
                        console.warn(`[SKU Seeder] Warning: Thumbnail ${pre.thumb} not found for SKU in ${spu.product_slug}`);
                    }

                    await createOrUpdateSKU(spu._id, pre.tierIdx, {
                        sku_product: spu._id,
                        sku_tier_idx: pre.tierIdx,
                        sku_price: pre.price,
                        sku_stock: pre.stock,
                        sku_thumb: thumbMedia?._id || spu.product_thumb,
                        sku_images: imageIds.length > 0 ? imageIds : spu.product_images,
                        is_deleted: false
                    });
                }
                continue; // Skip dynamic generation for this SPU
            }

            const product_price = spu.product_price || 0;
            const product_variations = spu.product_variations || [];
            const product_thumb = spu.product_thumb;
            const product_images = spu.product_images || [];

            // Step 1: Handle products without variations (Simple Products)
            if (product_variations.length === 0) {
                await createOrUpdateSKU(spu._id, [], {
                    sku_product: spu._id,
                    sku_tier_idx: [],
                    sku_price: product_price,
                    sku_stock: 50,
                    sku_thumb: product_thumb,
                    sku_images: product_images,
                    is_deleted: false
                });
                continue;
            }

            // Step 2: Generate all combinations for Variable Products
            const variationValues = product_variations.map((v: any) => v.variation_values);
            const combinations = cartesian(...variationValues);

            for (const combination of combinations) {
                const tierIdx: number[] = [];
                let priceModifier = 0;
                let selectedImageId = product_thumb;

                // Step 3: Process each combination and calculate pricing/images
                combination.forEach((val: string, index: number) => {
                    const variation = product_variations[index];
                    const valIndex = variation.variation_values.indexOf(val);
                    tierIdx.push(valIndex);

                    // Dynamic Price Logic (Apple-style example rules)
                    if (variation.variation_name === 'Storage') {
                        if (val === '512GB') priceModifier += 3000000;
                        if (val === '1TB') priceModifier += 9000000;
                        if (val === '2TB') priceModifier += 15000000;
                    }
                    if (variation.variation_name === 'RAM') {
                        if (val === '36GB') priceModifier += 5000000;
                        if (val === '48GB') priceModifier += 10000000;
                        if (val === '64GB') priceModifier += 18000000;
                        if (val === '96GB') priceModifier += 25000000;
                        if (val === '128GB') priceModifier += 30000000;
                    }
                    if (variation.variation_name === 'Chip') {
                        if (val === 'M3 Max') priceModifier += 12000000;
                    }
                    if (variation.variation_name === 'Connectivity') {
                        if (val.includes('Cellular')) priceModifier += 3500000;
                    }

                    // Dynamic Thumbnail Selection
                    if (variation.variation_images && variation.variation_images.length > 0) {
                        if (variation.variation_images[valIndex]) {
                            // Prioritize color variations for images
                            if (variation.variation_name === 'Color' || !selectedImageId || selectedImageId === product_thumb) {
                                selectedImageId = variation.variation_images[valIndex] as any;
                            }
                        }
                    }
                });

                // Construct final image list for the SKU
                const skuImages = selectedImageId !== product_thumb
                    ? [selectedImageId, ...product_images]
                    : product_images;

                // Step 4: Upsert the specific SKU generated from the combination
                await createOrUpdateSKU(spu._id, tierIdx, {
                    sku_product: spu._id,
                    sku_tier_idx: tierIdx,
                    sku_price: product_price + priceModifier,
                    sku_stock: Math.floor(Math.random() * 50) + 10, // Simulated random stock
                    sku_thumb: selectedImageId,
                    sku_images: skuImages,
                    is_deleted: false
                });
            }
        }
    }
}

// Export a singleton instance
export const skuSeeder = new SKUSeeder();
