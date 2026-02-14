import { Schema, model } from 'mongoose';
import { ObjectId } from '@/configs/mongoose.config.js';
import { required, timestamps, unique } from '@/configs/mongoose.config.js';
import { addSlug } from '@/models/middlewares/spu.middleware.js';

/* ------------------------ Constants ----------------------- */
import { USER_MODEL_NAME } from './user.model.js';
import { CATEGORY_MODEL_NAME } from './category.model.js';
import { MEDIA_MODEL_NAME } from './media.model.js';
import { SHOP_MODEL_NAME } from './shop.model.js';

export const SPU_MODEL_NAME = 'SPU';
export const SPU_COLLECTION_NAME = 'spus';

const spuSchema = new Schema<model.spu.SPUSchema, true>(
    {
        /* ------------------------ Product ------------------------ */
        product_name: { type: String, required },
        product_quantity: { type: Number, required },
        product_price: { type: Number, required },
        product_description: { type: String, required },
        product_category: { type: ObjectId, ref: CATEGORY_MODEL_NAME, required },
        product_shop: { type: ObjectId, required, ref: SHOP_MODEL_NAME },
        product_sold: { type: Number, default: 0 },
        product_rating_avg: {
            default: 0,
            type: Number,
            min: 0,
            max: 5,
            set: (v: number) => Math.round(v * 100) / 100
        },
        product_slug: { type: String, default: '', unique },

        /* -------------------------- Media ------------------------- */
        product_thumb: { type: ObjectId, ref: MEDIA_MODEL_NAME, required },
        product_images: {
            type: [ObjectId],
            ref: MEDIA_MODEL_NAME,
            default: []
        },

        /* --------------------------- SPU -------------------------- */
        product_attributes: {
            type: [
                {
                    attr_id: { type: ObjectId },
                    attr_name: { type: String, required },
                    attr_value: { type: String, required }
                }
            ],
            default: []
        },
        product_variations: {
            type: [
                {
                    variation_id: { type: ObjectId },
                    variation_name: { type: String, required },
                    variation_values: { type: [String], required },
                    variation_images: {
                        type: [{ type: ObjectId, ref: MEDIA_MODEL_NAME }]
                    }
                }
            ],
            default: []
        },

        /* ------------------------ Metadata ------------------------ */
        is_draft: { type: Boolean, default: true },
        is_publish: { type: Boolean, default: false },
        is_deleted: { type: Boolean, default: false, select: false },
        deleted_at: { type: Date, default: null, select: false }
    },
    {
        collection: SPU_COLLECTION_NAME,
        timestamps
    }
);
// Create index to search product
spuSchema.index({
    product_name: 'text',
    product_description: 'text',
    product_category: 'text'
});

// Create slug for product
spuSchema.pre('save', addSlug);

export const spuModel = model(SPU_MODEL_NAME, spuSchema);
