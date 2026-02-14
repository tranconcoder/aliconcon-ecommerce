
import { spuModel } from '@/models/spu.model.js';
import categoryModel from '@/models/category.model.js';
import shopModel from '@/models/shop.model.js';
import mediaModel from '@/models/media.model.js';
import mongoose from 'mongoose';
import { ShopStatus } from '@/enums/shop.enum.js';
import { MediaTypes, MediaMimeTypes } from '@/enums/media.enum.js';
import { SPU_BASE_PATH } from '@/configs/media.config.js';

interface Variation {
    name: string;
    values: string[];
    images?: string[];
}

interface ProductSeedData {
    name: string;
    desc: string;
    cat: any;
    price: number;
    image: string;
    slug: string;
    attrs: { attr_name: string; attr_value: string }[];
    variations: Variation[];
}

export const initSPU = async () => {
    // 1. Get Shop
    const shop = await shopModel.findOne({ shop_status: ShopStatus.ACTIVE });
    if (!shop) {
        console.error('❌ Shop not found for SPU seeder');
        return;
    }

    // 2. Get Categories
    const electronics = await categoryModel.findOne({ category_name: 'Điện tử' });
    const phones = await categoryModel.findOne({ category_name: 'Điện thoại' });
    const laptops = await categoryModel.findOne({ category_name: 'Laptop' });
    const tablets = await categoryModel.findOne({ category_name: 'Máy tính bảng' });

    if (!electronics) {
        console.error('❌ Categories not found for SPU seeder');
        return;
    }

    // 3. Create/Get Media for Products
    const products: ProductSeedData[] = [
        {
            name: 'iPhone 15 Pro Max',
            desc: 'The ultimate iPhone with titanium design.',
            cat: phones?._id || electronics._id,
            price: 1200,
            image: 'iphone-15-pro.png',
            slug: 'iphone-15-pro-max',
            attrs: [
                { attr_name: 'Brand', attr_value: 'Apple' },
                { attr_name: 'Material', attr_value: 'Titanium' }
            ],
            variations: [
                {
                    name: 'Color',
                    values: ['Natural Titanium', 'Blue Titanium', 'Black Titanium', 'White Titanium'],
                    images: ['iphone_15_pro_natural_titanium.png', 'iphone_15_pro_blue_titanium.png', 'iphone_15_pro_black_titanium.png', 'iphone_15_pro_white_titanium.png']
                },
                {
                    name: 'Storage',
                    values: ['256GB', '512GB', '1TB'],
                    images: []
                }
            ]
        },
        {
            name: 'Samsung Galaxy S24 Ultra',
            desc: 'Galaxy AI is here.',
            cat: phones?._id || electronics._id,
            price: 1100,
            image: 'samsung-s24.png',
            slug: 'samsung-galaxy-s24-ultra',
            attrs: [
                { attr_name: 'Brand', attr_value: 'Samsung' },
                { attr_name: 'Pen', attr_value: 'S-Pen Included' }
            ],
            variations: [
                {
                    name: 'Color',
                    values: ['Titanium Grey', 'Titanium Black', 'Titanium Violet', 'Titanium Yellow'],
                    images: ['samsung_s24_ultra_titanium_grey.png', 'samsung_s24_ultra_titanium_black.png', 'samsung_s24_ultra_titanium_violet.png', 'samsung_s24_ultra_titanium_yellow.png']
                },
                {
                    name: 'Storage',
                    values: ['256GB', '512GB', '1TB']
                }
            ]
        },
        {
            name: 'MacBook Pro 16 M3',
            desc: 'Mind-blowing. Head-turning.',
            cat: laptops?._id || electronics._id,
            price: 2500,
            image: 'macbook-pro.png',
            slug: 'macbook-pro-16-m3',
            attrs: [
                { attr_name: 'Brand', attr_value: 'Apple' },
                { attr_name: 'Screen', attr_value: 'Liquid Retina XDR' }
            ],
            variations: [
                {
                    name: 'Chip',
                    values: ['M3 Pro', 'M3 Max']
                },
                {
                    name: 'RAM',
                    values: ['18GB', '36GB', '48GB', '64GB', '96GB', '128GB']
                }
            ]
        },
        {
            name: 'iPad Pro 13 M4',
            desc: 'Thinpossible.',
            cat: tablets?._id || electronics._id,
            price: 1300,
            image: 'ipad-pro.png',
            slug: 'ipad-pro-13-m4',
            attrs: [
                { attr_name: 'Brand', attr_value: 'Apple' },
                { attr_name: 'Screen', attr_value: 'Ultra Retina XDR' }
            ],
            variations: [
                {
                    name: 'Color',
                    values: ['Silver', 'Space Black'],
                    images: ['ipad_pro_silver.png', 'ipad_pro_space_black.png']
                },
                {
                    name: 'Connectivity',
                    values: ['Wi-Fi', 'Wi-Fi + Cellular']
                },
                {
                    name: 'Storage',
                    values: ['256GB', '512GB', '1TB', '2TB']
                }
            ]
        },
        {
            name: 'Sony WH-1000XM5',
            desc: 'Your world. Nothing else.',
            cat: electronics._id,
            price: 350,
            image: 'sony-headphones.png',
            slug: 'sony-wh-1000xm5',
            attrs: [
                { attr_name: 'Brand', attr_value: 'Sony' },
                { attr_name: 'Type', attr_value: 'Over-ear' }
            ],
            variations: [
                {
                    name: 'Color',
                    values: ['Black', 'Silver', 'Midnight Blue'],
                    images: ['sony_wh1000xm5_black.png', 'sony_wh1000xm5_silver.png', 'sony_wh1000xm5_midnight_blue.png']
                }
            ]
        }
    ];

    for (const p of products) {
        // Collect all images (Main + Variations)
        const allImages = new Set<string>();
        allImages.add(p.image);
        p.variations.forEach(v => {
            if (v.images) {
                v.images.forEach(img => allImages.add(img));
            }
        });

        const mediaMap = new Map<string, any>();

        // Ensure all media exists
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
                    media_owner: shop.shop_userId
                });
            }
            mediaMap.set(imgName, media);
        }

        const mainMedia = mediaMap.get(p.image);

        const spuData = {
            product_name: p.name,
            product_thumb: mainMedia._id,
            product_description: p.desc,
            product_price: p.price,
            product_category: p.cat,
            product_shop: shop._id,
            product_attributes: p.attrs.map(attr => ({
                attr_id: new mongoose.Types.ObjectId(),
                attr_name: attr.attr_name,
                attr_value: attr.attr_value
            })),
            product_variations: p.variations.map(variation => {
                const variationImages = variation.images && variation.images.length > 0 
                    ? variation.images 
                    : variation.values.map(() => p.image); // Fallback to main image

                // Get Media IDs
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
            product_images: [mainMedia._id] // Could add more if we had them
        };

       await spuModel.findOneAndUpdate(
            { product_slug: p.slug },
            spuData,
            { upsert: true, new: true }
        );
    }
};
