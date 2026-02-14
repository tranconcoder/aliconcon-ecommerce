import { Schema, model, Document } from 'mongoose';

const DOCUMENT_NAME = 'SavedDiscount';
const COLLECTION_NAME = 'saved_discounts';

export interface SavedDiscountItem {
    discount_id: Schema.Types.ObjectId;
    saved_at: Date;
}

export interface SavedDiscountDocument extends Document {
    _id: string;
    user_id: Schema.Types.ObjectId;
    saved_discounts: SavedDiscountItem[];
    created_at: Date;
    updated_at: Date;
}

const savedDiscountItemSchema = new Schema({
    discount_id: {
        type: Schema.Types.ObjectId,
        ref: 'Discount',
        required: true
    },
    saved_at: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const savedDiscountSchema = new Schema(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
            index: true
        },
        saved_discounts: {
            type: [savedDiscountItemSchema],
            default: [],
            validate: {
                validator: function (discounts: SavedDiscountItem[]) {
                    return discounts.length <= 100;
                },
                message: 'Không thể lưu quá 100 mã giảm giá'
            }
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        },
        collection: COLLECTION_NAME
    }
);

// Index for efficient queries
savedDiscountSchema.index({ user_id: 1 });
savedDiscountSchema.index({ 'saved_discounts.discount_id': 1 });
savedDiscountSchema.index({ 'saved_discounts.saved_at': -1 });

export default model<SavedDiscountDocument>(DOCUMENT_NAME, savedDiscountSchema); 