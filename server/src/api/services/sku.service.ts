import { findSPUById } from '@/models/repository/spu/index.js';
import skuModel, { SKU_COLLECTION_NAME } from '@/models/sku.model.js';
import { BadRequestErrorResponse, NotFoundErrorResponse } from '@/response/error.response.js';
import inventoryService from './inventory.service.js';
import { increaseWarehouseStock } from '@/models/repository/warehouses/index.js';
import mongoose from 'mongoose';
import { CATEGORY_COLLECTION_NAME } from '@/models/category.model.js';
import { SPU_COLLECTION_NAME, spuModel } from '@/models/spu.model.js';
import { getAllSKUAggregate, getAllSKUAggregateSort } from '@/utils/sku.util.js';
import { findAllSKU } from '@/models/repository/sku/index.js';
import { findCategories } from '@/models/repository/category/index.js';
import { SHOP_COLLECTION_NAME } from '@/models/shop.model.js';

export default new (class SKUService {
    /* ---------------------------------------------------------- */
    /*                           Helper                           */
    /* ---------------------------------------------------------- */

    /* ----------- Get all child category IDs recursively ------- */
    private async getAllChildCategoryIds(categoryIds: string[]): Promise<string[]> {
        if (!categoryIds || categoryIds.length === 0) return [];

        console.log('🔍 Finding child categories for:', categoryIds);

        const allCategoryIds = [...categoryIds];
        const processedIds = new Set<string>();

        while (allCategoryIds.length > 0) {
            const currentId = allCategoryIds.shift()!;

            if (processedIds.has(currentId)) {
                continue;
            }

            processedIds.add(currentId);

            // Find all direct children of current category
            const childCategories = await findCategories({
                query: {
                    category_parent: new mongoose.Types.ObjectId(currentId),
                    is_deleted: false
                },
                options: { lean: true }
            });

            console.log(`📂 Category ${currentId} has ${childCategories.length} children:`,
                childCategories.map(c => ({ id: c._id.toString(), name: c.category_name })));

            // Add child IDs to be processed
            for (const child of childCategories) {
                if (!processedIds.has(child._id.toString())) {
                    allCategoryIds.push(child._id.toString());
                }
            }
        }

        const result = Array.from(processedIds);
        console.log('✅ Final category IDs (including children):', result);
        return result;
    }

    /* ---------------------------------------------------------- */
    /*                           Create                           */
    /* ---------------------------------------------------------- */
    async createSKU(payload: service.sku.arguments.CreateSKU) {
        const { sku_product, sku_tier_idx } = payload;

        /* -------------------- Check spu product ------------------- */
        const spu = await findSPUById({ id: sku_product, options: { lean: true } });
        if (!spu) throw new NotFoundErrorResponse({ message: 'Invalid spu!' });

        /* ----------------- Check tier index length ---------------- */
        if (spu.product_variations.length < sku_tier_idx.length) {
            throw new NotFoundErrorResponse({ message: 'Invalid tier index!' });
        }

        sku_tier_idx.forEach((idx, order) => {
            /* ------------------ Index is out of range ----------------- */
            if (idx >= spu.product_variations[order].variation_values.length) {
                throw new NotFoundErrorResponse({ message: 'Invalid tier index!' });
            }
        });

        /* --------------------- Handle save sku -------------------- */
        const sku = await skuModel.create(payload);
        const completed = [];
        try {
            /* -------------------- Create inventory -------------------- */
            const inventory = await inventoryService.createInventory({
                inventory_shop: spu.product_shop,
                inventory_sku: sku._id,
                inventory_warehouses: payload.warehouse,
                inventory_stock: payload.sku_stock
            });
            if (!inventory) {
                throw new BadRequestErrorResponse({ message: 'Create inventory failed!' });
            } else completed.push(inventory);

            /* -------------------- Increase warehouse ------------------ */
            const warehouse = await increaseWarehouseStock(payload.warehouse, payload.sku_stock);
            if (!warehouse) {
                throw new BadRequestErrorResponse({ message: 'Increase warehouse stock failed!' });
            } else completed.push(warehouse);
        } catch (error: any) {
            await Promise.allSettled(completed.map((item) => item.deleteOne()));

            throw new BadRequestErrorResponse({ message: error?.message || 'Create sku failed!' });
        }

        return sku;
    }

    /* ---------------------------------------------------------- */
    /*                             Get                            */
    /* ---------------------------------------------------------- */

    /* ----------------- Get popular sku by all ----------------- */
    async getPopularSKUByAll({ page = 1, limit = 50 }: commonTypes.object.Pagination) {
        return await spuModel.aggregate([
            // Pagination
            ...getAllSKUAggregateSort(limit, page, 'spu.product_sold')
        ]);
    }

    /* ------------------------ Get by id ----------------------- */
    async getSKUById({ skuId }: service.sku.arguments.GetSKUById) {
        return await skuModel.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(skuId),
                    is_deleted: false
                }
            },
            {
                $lookup: {
                    from: SPU_COLLECTION_NAME,
                    localField: 'sku_product',
                    foreignField: '_id',
                    as: 'spu_select'
                }
            },
            {
                $lookup: {
                    from: CATEGORY_COLLECTION_NAME,
                    localField: 'spu_select.product_category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $lookup: {
                    from: SHOP_COLLECTION_NAME,
                    localField: 'spu_select.product_shop',
                    foreignField: '_id',
                    as: 'shop'
                }
            },
            {
                $unwind: {
                    path: '$shop',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    shop: {
                        _id: '$shop._id',
                        shop_name: '$shop.shop_name',
                        shop_logo: '$shop.shop_logo',
                        shop_description: '$shop.shop_description',
                        shop_status: '$shop.shop_status'
                    }
                }
            },
            {
                $unwind: '$spu_select'
            },
            {
                $match: {
                    'spu_select.is_deleted': false,
                    'spu_select.is_draft': false,
                    'spu_select.is_publish': true
                }
            },
            {
                $lookup: {
                    from: SKU_COLLECTION_NAME,
                    localField: 'sku_product',
                    foreignField: 'sku_product',
                    as: 'sku_others'
                }
            },
            {
                $match: {
                    'sku_others.is_deleted': false
                }
            },
            {
                $addFields: {
                    sku_others: {
                        $filter: {
                            input: '$sku_others',
                            as: 'sku',
                            cond: { $ne: ['$$sku._id', new mongoose.Types.ObjectId(skuId)] }
                        }
                    }
                }
            },
            {
                $project: {
                    /* ----------------------- SPU Select ----------------------- */
                    'spu_select.is_deleted': 0,
                    'spu_select.deleted_at': 0,
                    'spu_select.created_at': 0,
                    'spu_select.updated_at': 0,
                    'spu_select.__v': 0,

                    /* ------------------------ Category ------------------------ */
                    'category.is_deleted': 0,
                    'category.deleted_at': 0,
                    'category.created_at': 0,
                    'category.updated_at': 0,

                    /* ------------------------ SKU List ------------------------ */
                    'sku_others.is_deleted': 0,
                    'sku_others.created_at': 0,
                    'sku_others.updated_at': 0,
                    'sku_others.__v': 0
                }
            }
        ]);
    }

    /* -------------------- Get all shop SKU -------------------- */
    async getAllShopSKUByAll({
        shopId,
        limit = 50,
        page = 1
    }: service.sku.arguments.GetAllSKUShopByAll) {
        return await spuModel.aggregate([
            { $match: { product_shop: new mongoose.Types.ObjectId(shopId) } },
            ...getAllSKUAggregate(limit, page)
        ]);
    }

    /* --------------------- Get all SKU ----------------------- */
    async getAllSKUByAll({
        limit = 50,
        page = 1,
        search,
        categories,
        minPrice,
        maxPrice,
        inStock,
        minRating,
        shopId,
        sortBy = 'featured',
        sortOrder = 'desc'
    }: service.sku.arguments.GetAllSKUByAll) {
        // Ensure limit and page are numbers
        const numericLimit = Number(limit);
        const numericPage = Number(page);

        // Build match conditions
        const matchConditions: any = {
            is_deleted: false,
            is_draft: false,
            is_publish: true
        };

        // Add shop filter if provided
        if (shopId) {
            matchConditions.product_shop = new mongoose.Types.ObjectId(shopId);
        }

        // Add category filter with child categories
        if (categories && categories.length > 0) {
            console.log('🏷️ Original categories filter:', categories);
            const allCategoryIds = await this.getAllChildCategoryIds(categories);
            const categoryObjectIds = allCategoryIds.map(id => new mongoose.Types.ObjectId(id));
            console.log('🎯 MongoDB query will filter by categories:', categoryObjectIds);
            matchConditions.product_category = { $in: categoryObjectIds };
        }

        // Build SKU match conditions
        const skuMatchConditions: any = {
            'sku.is_deleted': false
        };

        // Add stock filter
        if (inStock) {
            skuMatchConditions['sku.sku_stock'] = { $gt: 0 };
        }

        // Add price range filter
        if (minPrice !== undefined || maxPrice !== undefined) {
            const priceCondition: any = {};
            if (minPrice !== undefined) priceCondition.$gte = Number(minPrice);
            if (maxPrice !== undefined) priceCondition.$lte = Number(maxPrice);
            skuMatchConditions['sku.sku_price'] = priceCondition;
        }

        // Add rating filter
        if (minRating !== undefined) {
            matchConditions.product_rating_avg = { $gte: Number(minRating) };
        }

        // Add text search
        if (search) {
            matchConditions.$or = [
                { product_name: { $regex: search, $options: 'i' } },
                { product_description: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort conditions
        let sortCondition: any = {};
        switch (sortBy) {
            case 'newest':
                sortCondition = { created_at: sortOrder === 'asc' ? 1 : -1 };
                break;
            case 'price-low':
                sortCondition = { 'sku.sku_price': 1 };
                break;
            case 'price-high':
                sortCondition = { 'sku.sku_price': -1 };
                break;
            case 'rating':
                sortCondition = { product_rating_avg: sortOrder === 'asc' ? 1 : -1 };
                break;
            case 'sold':
                sortCondition = { product_sold: sortOrder === 'asc' ? 1 : -1 };
                break;
            default: // featured
                sortCondition = { product_sold: -1, product_rating_avg: -1 };
                break;
        }

        return await spuModel.aggregate([
            {
                $match: matchConditions
            },
            {
                $lookup: {
                    from: SKU_COLLECTION_NAME,
                    localField: '_id',
                    foreignField: 'sku_product',
                    as: 'sku'
                }
            },
            {
                $addFields: {
                    // Filter SKUs within the array to match SKU-level conditions
                    sku: {
                        $filter: {
                            input: '$sku',
                            as: 's',
                            cond: {
                                $and: [
                                    { $eq: ['$$s.is_deleted', false] },
                                    // Price filter
                                    ...(minPrice !== undefined ? [{ $gte: ['$$s.sku_price', Number(minPrice)] }] : []),
                                    ...(maxPrice !== undefined ? [{ $lte: ['$$s.sku_price', Number(maxPrice)] }] : []),
                                    // Stock filter
                                    ...(inStock ? [{ $gt: ['$$s.sku_stock', 0] }] : [])
                                ]
                            }
                        }
                    }
                }
            },
            {
                // Ensure at least one SKU matches
                $match: {
                    sku: { $not: { $size: 0 } }
                }
            },
            {
                $addFields: {
                    // Pick the best SKU (representative). 
                    // Since sales data is at SPU level, we pick the one with lowest price as representative.
                    sku: {
                        $arrayElemAt: [
                            {
                                $sortArray: {
                                    input: '$sku',
                                    sortBy: { sku_price: 1 }
                                }
                            },
                            0
                        ]
                    }
                }
            },

            /* ---------------- Only get category active ---------------- */
            {
                $lookup: {
                    from: CATEGORY_COLLECTION_NAME,
                    localField: 'product_category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $lookup: {
                    from: SHOP_COLLECTION_NAME,
                    localField: 'product_shop',
                    foreignField: '_id',
                    as: 'shop'
                }
            },
            {
                $unwind: {
                    path: '$shop',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: '$category'
            },
            {
                $match: {
                    'category.is_active': true
                }
            },

            /* ---------------- Calculate SKU value ---------------- */
            {
                $addFields: {
                    'sku.sku_value': {
                        $map: {
                            input: { $range: [0, { $size: '$sku.sku_tier_idx' }] },
                            as: 'idx',
                            in: {
                                key: {
                                    $getField: {
                                        field: 'variation_name',
                                        input: { $arrayElemAt: ['$product_variations', '$$idx'] }
                                    }
                                },
                                value: {
                                    $arrayElemAt: [
                                        {
                                            $getField: {
                                                field: 'variation_values',
                                                input: { $arrayElemAt: ['$product_variations', '$$idx'] }
                                            }
                                        },
                                        { $arrayElemAt: ['$sku.sku_tier_idx', '$$idx'] }
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {
                $sort: sortCondition
            },
            {
                $skip: (numericPage - 1) * numericLimit
            },
            {
                $limit: numericLimit
            },
            {
                $project: {
                    _id: 1,

                    /* ------------------------ Category ------------------------ */
                    'category.category_name': 1,
                    'category.category_icon': 1,
                    'category.category_description': 1,

                    /* ------------------------- Product ------------------------ */
                    product_name: 1,
                    product_quantity: 1,
                    product_description: 1,
                    product_shop: 1,
                    product_sold: 1,
                    product_rating_avg: 1,
                    product_slug: 1,
                    product_thumb: 1,
                    product_images: 1,
                    product_variations: 1,

                    /* --------------------------- SKU -------------------------- */
                    'sku._id': 1,
                    'sku.sku_product': 1,
                    'sku.sku_price': 1,
                    'sku.sku_stock': 1,
                    'sku.sku_thumb': 1,
                    'sku.sku_images': 1,
                    'sku.sku_tier_idx': 1,

                    'sku.sku_value': 1,

                    /* -------------------------- Shop -------------------------- */
                    'shop._id': 1,
                    'shop.shop_name': 1,
                    'shop.shop_logo': 1,
                    'shop.shop_description': 1,
                    'shop.shop_status': 1
                }
            }
        ]);
    }

    // By own Shop
    // async getAllSPUInShopByShop() {}
})();
