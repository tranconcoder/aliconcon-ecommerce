import { Model, Schema, model } from 'mongoose';
import { SPU_COLLECTION_NAME, SPU_MODEL_NAME } from './spu.model.js';
import { MEDIA_MODEL_NAME } from './media.model.js';
import { ObjectId, timestamps } from '@/configs/mongoose.config.js';

export const SKU_MODEL_NAME = 'SKU';
export const SKU_COLLECTION_NAME = 'skus';

export const skuSchema = new Schema<model.sku.SKU>(
    {
        sku_product: { type: ObjectId, ref: SPU_MODEL_NAME, index: true },
        sku_price: { type: Number, required: true },
        sku_stock: { type: Number, required: true },

        sku_thumb: { type: ObjectId, ref: MEDIA_MODEL_NAME, required: true },
        sku_images: {
            type: [ObjectId],
            ref: MEDIA_MODEL_NAME,
            default: []
        },

        sku_tier_idx: {
            type: [Number],
            default: []
        },

        is_deleted: { type: Boolean, default: false, select: false }
    },
    {
        timestamps,
        collection: SKU_COLLECTION_NAME
    }
);

export default model(SKU_MODEL_NAME, skuSchema);
