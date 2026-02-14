
import skuModel from '@/models/sku.model.js';
import { spuModel } from '@/models/spu.model.js';
import mongoose from 'mongoose';

export const initSKU = async () => {
    const spus = await spuModel.find({});

    for (const spu of spus) {
        // Safe access to properties with default values if undefined
        const product_price = spu.product_price || 0;
        const product_variations = spu.product_variations || [];
        const product_thumb = spu.product_thumb;
        const product_images = spu.product_images || [];

        // If no variations, create one default SKU
        if (product_variations.length === 0) {
            const skuData = {
                sku_product: spu._id,
                sku_tier_idx: [0], 
                sku_price: product_price,
                sku_stock: 50,
                sku_thumb: product_thumb,
                sku_images: product_images,
                is_deleted: false
            };
             await createOrUpdateSKU(spu._id, [0], skuData);
             continue;
        }

        // Generate combinations
        const variationValues = product_variations.map(v => v.variation_values);
        const combinations = cartesian(...variationValues);

        for (const combination of combinations) {
            // Find indices for this combination
            const tierIdx: number[] = [];
            let priceModifier = 0;
            let selectedImageId = product_thumb;

            combination.forEach((val: string, index: number) => {
                const variation = product_variations[index];
                const valIndex = variation.variation_values.indexOf(val);
                tierIdx.push(valIndex);

                // Price logic based on Storage/RAM/Connectivity
                if (variation.variation_name === 'Storage') {
                    if (val === '512GB') priceModifier += 200;
                    if (val === '1TB') priceModifier += 400;
                    if (val === '2TB') priceModifier += 600;
                }
                if (variation.variation_name === 'RAM') {
                    if (val === '36GB') priceModifier += 400;
                    if (val === '48GB') priceModifier += 600;
                    if (val === '64GB') priceModifier += 800;
                    if (val === '96GB') priceModifier += 1000;
                    if (val === '128GB') priceModifier += 1200;
                }
                if (variation.variation_name === 'Chip') {
                    if (val === 'M3 Max') priceModifier += 500;
                }
                if (variation.variation_name === 'Connectivity') {
                    if (val.includes('Cellular')) priceModifier += 150;
                }

                // Image Selection Logic
                // If this variation has specific images, try to use the one matching the value index
                if (variation.variation_images && variation.variation_images.length > 0) {
                    // Assuming variation_images maps 1:1 to variation_values
                    if (variation.variation_images[valIndex]) {
                         // Only update selectedImageId if it hasn't been set by a "dominant" variation yet
                         // Or prioritize "Color" variation for image
                         if (variation.variation_name === 'Color' || !selectedImageId || selectedImageId === product_thumb) {
                            selectedImageId = variation.variation_images[valIndex] as any; // Cast to avoid TS issues if ObjectId type mismatch
                         }
                    }
                }
            });

            // Construct SKU Images (Thumbnail + Product Images)
            // Ideally we might want to filter product images to only show relevant color
            const skuImages = selectedImageId !== product_thumb 
                ? [selectedImageId, ...product_images] 
                : product_images;

            const skuUpdatedData = {
                sku_product: spu._id,
                sku_tier_idx: tierIdx,
                sku_price: product_price + priceModifier,
                sku_stock: Math.floor(Math.random() * 50) + 10,
                sku_thumb: selectedImageId, 
                sku_images: skuImages,
                is_deleted: false
            };
            
            await createOrUpdateSKU(spu._id, tierIdx, skuUpdatedData);
        }
    }
};

const createOrUpdateSKU = async (spuId: any, tierIdx: number[], data: any) => {
    const existingSku = await skuModel.findOne({ 
        sku_product: spuId,
        sku_tier_idx: tierIdx
    });
    
    if (!existingSku) {
            await skuModel.create(data);
    } else {
            await skuModel.updateOne({ _id: existingSku._id }, data);
    }
}

// Cartesian product helper
const cartesian = (...args: any[][]) => {
    if (args.length === 0) return [];
    if (args.length === 1) return args[0].map(item => [item]);
    return args.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
};
