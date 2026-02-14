import type { Document, HydratedDocument, Model, Models } from 'mongoose';
import type mongoose from 'mongoose';
import type { CategoryEnum } from '@/enums/spu.enum.ts';
import { Product } from '@/services/spu/index.ts';

declare global {
    namespace model {
        namespace spu {
            interface CommonFields {
                _id: moduleTypes.mongoose.ObjectId;
            }

            type SPUSchema<isModel = false, isDoc = false> = moduleTypes.mongoose.MongooseType<
                {
                    /* ------------------------ Product ------------------------ */
                    product_name: string;
                    product_shop: moduleTypes.mongoose.ObjectId;
                    product_price: number;
                    product_quantity: number;
                    product_description: string;
                    product_category: moduleTypes.mongoose.ObjectId;
                    product_rating_avg: number;
                    product_slug: string;
                    product_sold: number;

                    product_thumb: moduleTypes.mongoose.ObjectId;
                    product_images: Array<moduleTypes.mongoose.ObjectId>;

                    /* --------------------------- SPU -------------------------- */
                    product_attributes: Array<{
                        attr_id: moduleTypes.mongoose.ObjectId;
                        attr_name: string;
                        attr_value: string;
                    }>;
                    product_variations: Array<{
                        variation_id: moduleTypes.mongoose.ObjectId;
                        variation_name: string;
                        variation_values: Array<string>;
                        variation_images: Array<moduleTypes.mongoose.ObjectId>;
                    }>;

                    /* ------------------------ Metadata ------------------------ */
                    is_draft: boolean;
                    is_publish: boolean;
                    is_deleted: boolean;
                    deleted_at: Date;
                },
                isModel,
                isDoc,
                CommonFields
            >;
        }
    }
}
