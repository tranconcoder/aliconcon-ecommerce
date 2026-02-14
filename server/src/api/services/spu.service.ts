import { ShopStatus } from '@/enums/shop.enum.js';
import { findOneCategory } from '@/models/repository/category/index.js';
import { findOneShop } from '@/models/repository/shop/index.js';
import { spuModel } from '@/models/spu.model.js';
import mongoose from 'mongoose';
import {
    BadRequestErrorResponse,
    ForbiddenErrorResponse,
    NotFoundErrorResponse
} from '@/response/error.response.js';
import skuService from './sku.service.js';
import { SKUImages } from '@/enums/sku.enum.js';
import { SPUImages } from '@/enums/spu.enum.js';
import {
    findOneAndUpdateSPU,
    findOneSPU,
    findSPUPageSpliting as findSPUPaganation
} from '@/models/repository/spu/index.js';
import {
    findMaxPriceSKU,
    findMinPriceSKU,
    findSKU,
    findSKUOfSPU,
    findSKUById,
    findOneAndUpdateSKU as findOneAndUpdateSKURepo
} from '@/models/repository/sku/index.js';
import { decreaseWarehouseStock } from '@/models/repository/warehouses/index.js';
import inventoryModel from '@/models/inventory.model.js';
import skuModel from '@/models/sku.model.js';
import mediaService from './media.service.js';

export default new (class SPUService {
    /* ---------------------------------------------------------- */
    /*                           Create                           */
    /* ---------------------------------------------------------- */
    async createSPU(payload: service.spu.arguments.CreateSPU) {
        const {
            product_category,
            product_shop,
            sku_list,
            sku_images_map,
            mediaIds,
            is_draft,
            is_publish,
            product_attributes,
            product_variations,
            product_description,
            product_name
        } = payload;

        /* --------------------- Check media ids ------------------ */
        const skuThumbCount = mediaIds[SKUImages.SKU_THUMB].length;

        if (skuThumbCount !== sku_list.length)
            throw new BadRequestErrorResponse({ message: 'Invalid SKU thumb count!' });
        if (sku_images_map.length !== sku_list.length)
            throw new BadRequestErrorResponse({ message: 'Invalid SKU images map!' });

        /* --------------------- Check category --------------------- */
        const category = await findOneCategory({
            query: { _id: product_category, is_active: true, is_deleted: false },
            options: { lean: true }
        });
        if (!category) {
            throw new NotFoundErrorResponse({ message: 'Invalid category!' });
        }

        /* ---------------------- Check shop ----------------------- */
        const shop = await findOneShop({
            query: { shop_userId: product_shop },
            options: { lean: true }
        });
        if (!shop) throw new NotFoundErrorResponse({ message: 'Invalid shop!' });
        if (shop.is_deleted) throw new NotFoundErrorResponse({ message: 'Shop is deleted!' });
        if (shop.shop_status !== ShopStatus.ACTIVE)
            throw new ForbiddenErrorResponse({
                message: 'Shop is not active!'
            });

        /* --------------------- Handle save spu ------------------- */
        const quantity = sku_list.reduce((acc, cur) => acc + Number(cur.sku_stock), 0);

        // Add attr_id to all product attributes
        const attributesWithId = product_attributes.map(attr => ({
            ...attr,
            attr_id: new mongoose.Types.ObjectId()
        }));

        const spu = await spuModel.create({
            product_name,
            product_quantity: quantity,
            product_category: category._id,
            product_description,
            product_attributes: attributesWithId,
            product_variations,
            product_shop: shop._id,
            product_sold: 0,
            product_thumb: mediaIds[SPUImages.PRODUCT_THUMB][0],
            product_images: mediaIds[SPUImages.PRODUCT_IMAGES],
            is_publish,
            is_draft
        });

        /* --------------------- Handle save sku ------------------- */
        try {
            let skuPromises: model.sku.SKU<false, true>[] = [];

            if (sku_list.length) {
                skuPromises = await Promise.all(
                    sku_list.map(async (sku, index) => {
                        const skuImageStartIdx = sku_images_map
                            .slice(0, index)
                            .reduce((acc, cur) => acc + cur, 0);
                        const skuImageCount = sku_images_map[index];

                        return await skuService.createSKU({
                            sku_price: sku.sku_price,
                            sku_stock: sku.sku_stock,
                            sku_tier_idx: sku.sku_tier_idx,
                            sku_product: spu._id,
                            sku_thumb: mediaIds[SKUImages.SKU_THUMB][index],
                            sku_images: mediaIds[SKUImages.SKU_IMAGES].slice(
                                skuImageStartIdx,
                                skuImageStartIdx + skuImageCount
                            ),
                            warehouse: sku.warehouse
                        });
                    })
                );
            }

            return {
                spu: spu.toObject(),
                sku_list: skuPromises.map((sku) => sku.toObject())
            };
        } catch (error) {
            /* ----------------- Handle rollback spu ------------------ */
            await spu.deleteOne();
            console.log(error);

            throw new BadRequestErrorResponse({ message: 'Create SKU failed!' });
        }
    }

    /* ---------------------------------------------------------- */
    /*                            Update                           */
    /* ---------------------------------------------------------- */
    async updateSPU(payload: service.spu.arguments.UpdateSPU) {
        const { spuId, userId, mediaIds = {}, ...updateData } = payload;

        /* ---------------------- Check shop ----------------------- */
        const shop = await findOneShop({
            query: { shop_userId: userId, is_deleted: false },
            options: { lean: true }
        });
        if (!shop) throw new NotFoundErrorResponse({ message: 'Shop not found!' });
        if (shop.shop_status !== ShopStatus.ACTIVE)
            throw new ForbiddenErrorResponse({ message: 'Shop is not active!' });

        /* ---------------------- Check SPU ----------------------- */
        const existingSPU = await findOneSPU({
            query: {
                _id: spuId,
                product_shop: shop._id,
                is_deleted: false
            },
            options: { lean: true }
        });
        if (!existingSPU) throw new NotFoundErrorResponse({ message: 'SPU not found!' });

        /* --------------------- Check category --------------------- */
        if (updateData.product_category) {
            const category = await findOneCategory({
                query: { _id: updateData.product_category, is_active: true, is_deleted: false },
                options: { lean: true }
            });
            if (!category) {
                throw new NotFoundErrorResponse({ message: 'Invalid category!' });
            }
        }

        /* ------------------- Prepare SPU updates ------------------ */
        const spuUpdateData: any = {};

        if (updateData.product_name) spuUpdateData.product_name = updateData.product_name;
        if (updateData.product_category) spuUpdateData.product_category = updateData.product_category;
        if (updateData.product_description) spuUpdateData.product_description = updateData.product_description;
        if (updateData.is_draft !== undefined) spuUpdateData.is_draft = updateData.is_draft;
        if (updateData.is_publish !== undefined) spuUpdateData.is_publish = updateData.is_publish;

        /* ---------------- Handle product attributes --------------- */
        console.log('🔄 Processing attributes update...');
        console.log('📨 updateData:', {
            product_attributes_to_add: updateData.product_attributes_to_add,
            product_attributes_to_update: updateData.product_attributes_to_update,
            product_attributes_to_remove: updateData.product_attributes_to_remove
        });

        const currentAttributes = existingSPU.product_attributes || [];
        console.log('📋 Current attributes in DB:', currentAttributes);
        let updatedAttributes = [...currentAttributes];

        // Add new attributes
        if (updateData.product_attributes_to_add?.length) {
            console.log('➕ Adding new attributes...');
            for (const attr of updateData.product_attributes_to_add) {
                const newAttr = {
                    attr_id: new mongoose.Types.ObjectId(),
                    attr_name: attr.attr_name,
                    attr_value: attr.attr_value
                };
                updatedAttributes.push(newAttr);
                console.log('   Added:', newAttr);
            }
        }

        // Update existing attributes
        if (updateData.product_attributes_to_update?.length) {
            console.log('✏️ Updating existing attributes...');
            for (const attr of updateData.product_attributes_to_update) {
                console.log(`   Looking for attr_id: ${attr.attr_id} (type: ${typeof attr.attr_id})`);
                const index = updatedAttributes.findIndex(
                    (a: any) => {
                        // MongoDB stores attr_id as _id in subdocuments
                        const currentId = (a.attr_id || a._id)?.toString();
                        const targetId = attr.attr_id?.toString();
                        console.log(`     Comparing: "${currentId}" === "${targetId}"`);
                        return currentId === targetId;
                    }
                );
                console.log(`   Found at index: ${index}`);
                if (index !== -1) {
                    const oldAttr = { ...updatedAttributes[index] };
                    updatedAttributes[index] = {
                        ...updatedAttributes[index],
                        attr_name: attr.attr_name,
                        attr_value: attr.attr_value
                    };
                    console.log('   Updated:', { old: oldAttr, new: updatedAttributes[index] });
                } else {
                    console.log(`   ❌ Attribute with id ${attr.attr_id} not found!`);
                }
            }
        }

        // Remove attributes
        if (updateData.product_attributes_to_remove?.length) {
            console.log('🗑️ Removing attributes...');
            const beforeRemove = updatedAttributes.length;
            updatedAttributes = updatedAttributes.filter(
                (a: any) => !updateData.product_attributes_to_remove!.includes((a.attr_id || a._id)?.toString())
            );
            console.log(`   Removed ${beforeRemove - updatedAttributes.length} attributes`);
        }

        // Only update if there were attribute changes
        const hasAttributeChanges = updateData.product_attributes_to_add?.length ||
            updateData.product_attributes_to_update?.length ||
            updateData.product_attributes_to_remove?.length;

        console.log('🔍 Has attribute changes:', hasAttributeChanges);

        if (hasAttributeChanges) {
            spuUpdateData.product_attributes = updatedAttributes;
            console.log('💾 Will update attributes in DB:', updatedAttributes);
        }

        /* -------------------- Handle product thumb ------------------- */
        if (mediaIds[SPUImages.PRODUCT_THUMB]?.[0]) {
            // Remove old thumb if exists
            if (existingSPU.product_thumb) {
                await mediaService.softRemoveMedia(existingSPU.product_thumb.toString());
            }
            spuUpdateData.product_thumb = mediaIds[SPUImages.PRODUCT_THUMB][0];
        }

        /* -------------------- Handle product images ------------------ */
        if (mediaIds[SPUImages.PRODUCT_IMAGES]?.length) {
            // Remove old images if exists
            if (existingSPU.product_images?.length) {
                await Promise.all(
                    existingSPU.product_images.map(imageId =>
                        mediaService.softRemoveMedia(imageId.toString())
                    )
                );
            }
            spuUpdateData.product_images = mediaIds[SPUImages.PRODUCT_IMAGES];
        }

        /* -------------------- Handle SKU updates -------------------- */
        const skuUpdatePromises: Promise<any>[] = [];
        let totalQuantity = 0;

        if (updateData.sku_updates?.length) {
            for (let i = 0; i < updateData.sku_updates.length; i++) {
                const skuUpdate = updateData.sku_updates[i];

                // Get existing SKU
                const existingSKU = await findSKUById({
                    id: skuUpdate.sku_id,
                    options: { lean: true }
                });
                if (!existingSKU || existingSKU.sku_product.toString() !== spuId) {
                    throw new NotFoundErrorResponse({ message: `SKU ${skuUpdate.sku_id} not found!` });
                }

                const skuUpdatePayload: any = {};

                // Update price and stock
                if (skuUpdate.sku_price !== undefined) {
                    skuUpdatePayload.sku_price = skuUpdate.sku_price;
                }
                if (skuUpdate.sku_stock !== undefined) {
                    skuUpdatePayload.sku_stock = skuUpdate.sku_stock;
                    totalQuantity += skuUpdate.sku_stock;
                } else {
                    totalQuantity += existingSKU.sku_stock;
                }

                // Update tier index (check for conflicts)
                if (skuUpdate.sku_tier_idx) {
                    const newTierIdx = skuUpdate.sku_tier_idx;

                    // Check if this tier_idx already exists in other SKUs
                    const conflictingSKU = await skuModel.findOne({
                        sku_product: spuId,
                        _id: { $ne: skuUpdate.sku_id },
                        sku_tier_idx: newTierIdx,
                        is_deleted: false
                    });

                    if (conflictingSKU) {
                        throw new BadRequestErrorResponse({
                            message: `SKU tier index ${newTierIdx.join(',')} already exists!`
                        });
                    }

                    skuUpdatePayload.sku_tier_idx = newTierIdx;
                }

                // Handle SKU thumb update
                if (mediaIds[SKUImages.SKU_THUMB]?.[i]) {
                    // Remove old thumb
                    if (existingSKU.sku_thumb) {
                        await mediaService.softRemoveMedia(existingSKU.sku_thumb.toString());
                    }
                    skuUpdatePayload.sku_thumb = mediaIds[SKUImages.SKU_THUMB][i];
                }

                // Handle SKU images update
                let updatedImages = [...(existingSKU.sku_images || [])];

                // Remove specified images
                if (skuUpdate.sku_images_to_remove?.length) {
                    await Promise.all(
                        skuUpdate.sku_images_to_remove.map(imageId =>
                            mediaService.softRemoveMedia(imageId)
                        )
                    );
                    updatedImages = updatedImages.filter(
                        imageId => !skuUpdate.sku_images_to_remove!.includes(imageId.toString())
                    );
                }

                // Add new images from upload (mapped by sku_images_map)
                if (mediaIds[SKUImages.SKU_IMAGES_TO_ADD]?.length && updateData.sku_images_map?.[i]) {
                    const skuImageStartIdx = updateData.sku_images_map
                        .slice(0, i)
                        .reduce((acc, cur) => acc + cur, 0);
                    const skuImageCount = updateData.sku_images_map[i];

                    const newImages = mediaIds[SKUImages.SKU_IMAGES_TO_ADD].slice(
                        skuImageStartIdx,
                        skuImageStartIdx + skuImageCount
                    );
                    updatedImages.push(...newImages);
                }

                // Replace images
                if (skuUpdate.sku_images_to_replace?.length && mediaIds[SKUImages.SKU_IMAGES_TO_REPLACE]) {
                    for (const replacement of skuUpdate.sku_images_to_replace) {
                        const oldImageIndex = updatedImages.findIndex(
                            img => img.toString() === replacement.old_image_id
                        );
                        if (oldImageIndex !== -1 && mediaIds[SKUImages.SKU_IMAGES_TO_REPLACE][replacement.new_image_index]) {
                            // Remove old image
                            await mediaService.softRemoveMedia(replacement.old_image_id);
                            // Replace with new image
                            updatedImages[oldImageIndex] = mediaIds[SKUImages.SKU_IMAGES_TO_REPLACE][replacement.new_image_index];
                        }
                    }
                }

                if (Object.keys(skuUpdatePayload).length > 0 || updatedImages.length !== existingSKU.sku_images?.length) {
                    if (updatedImages.length !== existingSKU.sku_images?.length) {
                        skuUpdatePayload.sku_images = updatedImages;
                    }

                    skuUpdatePromises.push(
                        findOneAndUpdateSKURepo({
                            query: { _id: skuUpdate.sku_id },
                            update: skuUpdatePayload,
                            options: { lean: true, new: true }
                        })
                    );
                }
            }
        } else {
            // Calculate total quantity from existing SKUs if no SKU updates
            const existingSKUs = await findSKU({
                query: { sku_product: spuId, is_deleted: false },
                options: { lean: true }
            });
            totalQuantity = existingSKUs.reduce((acc, sku) => acc + sku.sku_stock, 0);
        }

        /* ------------ Update product quantity automatically ----------- */
        if (totalQuantity > 0) {
            spuUpdateData.product_quantity = totalQuantity;
        }

        /* -------------------- Execute all updates ------------------- */
        console.log('🚀 Executing updates...');
        console.log('📦 SPU update data:', spuUpdateData);
        console.log('🔑 Update keys:', Object.keys(spuUpdateData));

        try {
            const [updatedSPU, ...updatedSKUs] = await Promise.all([
                Object.keys(spuUpdateData).length > 0
                    ? findOneAndUpdateSPU({
                        query: { _id: spuId },
                        update: spuUpdateData,
                        options: { lean: true, new: true }
                    })
                    : existingSPU,
                ...skuUpdatePromises
            ]);

            console.log('✅ SPU updated successfully');
            console.log('📋 Updated attributes:', updatedSPU?.product_attributes);

            // Get final SKU list
            const finalSKUs = await findSKUOfSPU({ spuId });

            return {
                spu: updatedSPU,
                sku_list: finalSKUs,
                minPrice: await findMinPriceSKU(spuId),
                maxPrice: await findMaxPriceSKU(spuId)
            };
        } catch (error: any) {
            console.error('Update SPU error:', error);
            throw new BadRequestErrorResponse({
                message: error?.message || 'Update SPU failed!'
            });
        }
    }

    /* ---------------------------------------------------------- */
    /*                             Get                            */
    /* ---------------------------------------------------------- */

    /* ----------------------- Get SPU by ID ---------------------- */
    async getSPUById({ userId, spuId }: service.spu.arguments.GetSPUById) {
        const shop = await findOneShop({
            query: { shop_userId: userId, is_deleted: false },
            options: { lean: true }
        });
        if (!shop) throw new NotFoundErrorResponse({ message: 'Shop not found!' });

        const spu = await findOneSPU({
            query: {
                _id: spuId,
                product_shop: shop._id,
                is_deleted: false
            },
            options: {
                lean: true,
                populate: [
                    { path: 'product_thumb', select: 'media_url media_fileName' },
                    { path: 'product_images', select: 'media_url media_fileName' },
                    {
                        path: 'product_shop',
                        select: 'shop_name shop_logo',
                        populate: { path: 'shop_logo', select: 'media_url media_fileName' }
                    }
                ]
            }
        });
        if (!spu) throw new NotFoundErrorResponse({ message: 'SPU not found!' });

        // Get SKUs for this SPU
        const skus = await findSKUOfSPU({ spuId });

        return {
            ...spu,
            sku_list: skus,
            minPrice: await findMinPriceSKU(spuId),
            maxPrice: await findMaxPriceSKU(spuId)
        };
    }

    /* ---------------------------------------------------------- */
    /*                           Get all                          */
    /* ---------------------------------------------------------- */

    /* ------------------------- By shop ------------------------ */
    async getAllSPUOwnByShop({ userId, limit, page }: service.spu.arguments.GetAllSPUOwnByShop) {
        const shop = await findOneShop({ query: { shop_userId: userId }, options: { lean: true } });

        if (!shop) throw new NotFoundErrorResponse({ message: 'Shop not found!' });
        if (shop.is_deleted) throw new NotFoundErrorResponse({ message: 'Shop is deleted!' });
        if (shop.shop_status !== ShopStatus.ACTIVE)
            throw new ForbiddenErrorResponse({ message: 'Shop is not active!' });

        return await findSPUPaganation({
            query: { product_shop: shop._id, is_deleted: false },
            options: { lean: true, sort: [{ is_publish: 1 }, { createdAt: -1 }] },
            limit,
            page
        }).then(async (spuList) => {
            return await Promise.all(
                spuList.map(async (spu) => ({
                    minPrice: await findMinPriceSKU(spu._id.toString()),
                    maxPrice: await findMaxPriceSKU(spu._id.toString()),
                    ...spu
                }))
            );
        });
    }

    /* ------------------------- By user ------------------------ */
    async getAllSPUShopByAll({ page, limit }: commonTypes.object.Pagination) {
        return await findSPUPaganation({
            query: { is_deleted: false, is_draft: false, is_publish: true },
            options: {
                lean: true,
                populate: [
                    { path: 'product_thumb', select: 'media_url media_fileName' },
                    {
                        path: 'product_shop',
                        select: 'shop_name shop_logo',
                        populate: { path: 'shop_logo', select: 'media_url media_fileName' }
                    }
                ]
            },
            page,
            limit
        });
    }

    /* --------------------- Popular by all --------------------- */
    async getPopularSPUByAll({ page, limit }: commonTypes.object.Pagination) {
        return await findSPUPaganation({
            query: { is_deleted: false, is_draft: false, is_publish: true },
            options: { lean: true, sort: [{ product_sold: -1 }, { createdAt: -1 }] },
            page,
            limit
        });
    }

    /* ----------------------- Publish SPU ---------------------- */
    async publishSPU({ userId, spuId }: service.spu.arguments.PublishSPU) {
        const shop = await findOneShop({
            query: {
                shop_userId: userId,
                is_deleted: false,
                shop_status: ShopStatus.ACTIVE
            },
            options: { lean: true }
        });
        if (!shop) throw new NotFoundErrorResponse({ message: 'Shop not found!' });

        const newSPU = await findOneAndUpdateSPU({
            query: {
                _id: spuId,
                product_shop: shop._id,
                is_publish: false,
                is_draft: true,
                is_deleted: false
            },
            update: { is_publish: true, is_draft: false },
            options: { lean: true, new: true }
        });
        if (!newSPU) throw new NotFoundErrorResponse({ message: 'SPU not found!' });

        return newSPU;
    }

    /* ------------------------ Draft SPU ----------------------- */
    async unpublishSPU({ userId, spuId }: service.spu.arguments.DraftSPU) {
        const shop = await findOneShop({ query: { shop_userId: userId }, options: { lean: true } });
        if (!shop) throw new NotFoundErrorResponse({ message: 'Shop not found!' });

        const newSPU = await findOneAndUpdateSPU({
            query: {
                _id: spuId,
                product_shop: shop._id,
                is_publish: true,
                is_draft: false,
                is_deleted: false
            },
            update: { is_publish: false, is_draft: true },
            options: { lean: true, new: true }
        });
        if (!newSPU) throw new NotFoundErrorResponse({ message: 'SPU not found!' });

        return newSPU;
    }

    /* ---------------------------------------------------------- */
    /*                           Delete                           */
    /* ---------------------------------------------------------- */
    async deleteSPU(spuId: string) {
        /* ---------------------- Check is own ---------------------- */
        const spu = await findOneAndUpdateSPU({
            query: { _id: spuId, is_deleted: false },
            update: { $set: { is_deleted: true } },
            options: { lean: true, new: true }
        });

        if (!spu) throw new NotFoundErrorResponse({ message: 'SPU not found!' });
        else {
            let completedIndex = 0;

            try {
                /* ----------------------- Remove SKU ----------------------- */
                const { modifiedCount: removedSKU } = await skuModel.updateMany(
                    { sku_product: spu._id, is_deleted: false },
                    { $set: { is_deleted: true } }
                );
                if (!removedSKU) {
                    throw new BadRequestErrorResponse({ message: 'Remove SKU failed!' });
                } else completedIndex++;

                /* -------------------- Remove inventory -------------------- */
                const skuIds = await findSKU({
                    query: { sku_product: spu._id },
                    projection: { _id: 1 },
                    options: { lean: true }
                }).then((skus) => skus.map((sku) => sku._id));
                if (!skuIds.length) throw new NotFoundErrorResponse({ message: 'SKU not found!' });

                const { modifiedCount: removedInventory } = await inventoryModel.updateMany(
                    { inventory_sku: { $in: skuIds }, is_deleted: false },
                    { $set: { is_deleted: true, deleted_at: new Date() } }
                );
                if (!removedInventory)
                    throw new BadRequestErrorResponse({ message: 'Remove inventory failed!' });
                else completedIndex++;

                /* ---------------- Decrease warehouse stock ---------------- */
                decreaseWarehouseStock(spu._id.toString(), spu.product_quantity);
                completedIndex++;
            } catch (error: any) {
                console.log(error);
                const message = error?.message || 'Delete SPU failed!';
                throw new BadRequestErrorResponse({ message });
            }
        }

        return { success: true };
    }
})();
