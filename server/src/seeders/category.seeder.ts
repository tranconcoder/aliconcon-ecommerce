/**
 * @file category.seeder.ts
 * @description Seeder for categories and their associated media assets.
 */

import mongoose from 'mongoose';
import { seederDataManager } from './data/index.js';
import type { ICategoryData } from './data/category.data.js';
import { CATEGORY_BASE_PATH } from '@/configs/media.config.js';
import { MediaMimeTypes, MediaTypes } from '@/enums/media.enum.js';
import mediaModel from '@/models/media.model.js';
import categoryModel from '@/models/category.model.js';
import { Seeder } from './seeder.js';

/* ---------------------------------------------------------- */
/*                         Constants                          */
/* ---------------------------------------------------------- */

/** Base prefix used to generate consistent ObjectIds */
const basePrefix = '000000000000000000000000';

/**
 * Helper to generate a valid 24-character hex ObjectId from a suffix.
 * Suffixes can be of varying length (e.g., '01', '0401').
 */
const generateId = (suffix: string) => new mongoose.Types.ObjectId((basePrefix + suffix).slice(-24));

/* ---------------------------------------------------------- */
/*                      Category Seeder                       */
/* ---------------------------------------------------------- */

/**
 * Helper to fetch and typed data from the seeder manager.
 */
const getSeedData = () => seederDataManager.table<ICategoryData>('categories')?.getAll() || [];

/**
 * Seeder implementation for categories.
 * Handles dual-phase seeding: first creating media records for icons, 
 * then creating category records that link to those icons.
 */
class CategorySeeder extends Seeder {
    private seedData: ICategoryData[] = [];

    constructor() {
        super('Category & Media');
    }

    /**
     * @description Loads raw category data from the central manager.
     * @override
     * @returns {Promise<void>}
     */
    protected async prepare(): Promise<void> {
        this.seedData = getSeedData();
    }

    /**
     * @description Ensures we have data to seed.
     * @override
     * @returns {Promise<void>}
     */
    protected async validate(): Promise<void> {
        if (!this.seedData.length) throw new Error('No category data found');
    }

    /**
     * @description Executes the seeding process in two sub-steps (Media then Categories).
     * @override
     * @returns {Promise<void>}
     */
    protected async seed(): Promise<void> {
        // Clear existing data to ensure fresh seeding and avoid immutable ID errors
        await categoryModel.deleteMany({});
        
        // Safely clear only category icon media by filename
        const categoryIconNames = this.seedData.map(item => item.category_icon);
        await mediaModel.deleteMany({ media_fileName: { $in: categoryIconNames } });
        
        console.log('    ✓ Cleared existing category & media records');

        // --- Step 1: Seed Media (Icons) ---
        const mediaList = this.seedData.map((item) => {
            // Find suffixes of children to maintain folder-like structure in media metadata
            const childrenSuffixes = this.seedData
                .filter(child => child.category_parent_suffix === item.id_suffix)
                .map(child => child.id_suffix);

            return {
                _id: generateId(item.id_suffix),
                media_title: item.category_name,
                media_fileName: item.category_icon,
                get media_filePath() {
                    return `${CATEGORY_BASE_PATH}/${this.media_fileName}`;
                },
                media_fileType: MediaTypes.IMAGE,
                media_fileSize: 123456,
                media_mimeType: MediaMimeTypes.IMAGE_PNG,
                media_childrenList: childrenSuffixes.map(s => generateId(s)),
                media_desc: item.category_description,
                media_isFolder: false
            };
        });

        // Upsert all media icon records
        await Promise.all(
            mediaList.map((media) =>
                mediaModel.findOneAndReplace({ _id: media._id }, media, {
                    upsert: true, lean: true, new: true
                })
            )
        );
        console.log('    ✓ Media (Icons)');

        // --- Step 2: Seed Categories ---
        const categoryList = this.seedData.map((item) => {
            const id = generateId(item.id_suffix);
            const category: any = {
                _id: id,
                category_name: item.category_name,
                category_icon: id, // Linking icon media record (id suffix is shared)
                category_description: item.category_description
            };

            // Process parent relationship if applicable
            if (item.category_parent_suffix) {
                category.category_parent = generateId(item.category_parent_suffix);
            }

            return category;
        });

        // Upsert all category records
        for (const category of categoryList) {
            await categoryModel.findOneAndReplace(
                { category_name: category.category_name },
                category,
                { upsert: true, new: true, lean: true }
            );
        }
        console.log('    ✓ Categories');
    }
}

// Export a singleton instance
export const categorySeeder = new CategorySeeder();

/** 
 * Pre-built category list for other seeders that depend on it.
 * This provides immediate access to the category structure without re-running the logic.
 */
export const categories = (() => {
    const data = getSeedData();
    return data.map((item) => {
        const id = generateId(item.id_suffix);
        const category: any = {
            _id: id,
            category_name: item.category_name,
            category_icon: id,
            category_description: item.category_description
        };
        if (item.category_parent_suffix) {
            category.category_parent = generateId(item.category_parent_suffix);
        }
        return category;
    });
})();
