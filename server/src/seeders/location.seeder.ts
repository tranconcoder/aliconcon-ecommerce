/**
 * @file location.seeder.ts
 * @description Seeder for geographical location data (provinces, districts, wards).
 */

import jsonfile from 'jsonfile';
import path from 'path';
import { provinceModel, districtModel, wardModel } from '@/models/location.model.js';
import { Seeder } from './seeder.js';

/* ---------------------------------------------------------- */
/*                      Location Seeder                       */
/* ---------------------------------------------------------- */

/**
 * Helper to get the absolute path to location asset files.
 * @param fileName - Name of the JSON file.
 */
const getAssetPath = (fileName: string) =>
    path.join(import.meta.dirname, '../api/assets', fileName);

/**
 * Seeder implementation for geographical data.
 * Loads comprehensive location information from static JSON assets.
 */
class LocationSeeder extends Seeder {
    private provinces: any[] = [];
    private districts: any[] = [];
    private wards: any[] = [];

    constructor() {
        super('Location');
    }

    /**
     * @description Loads JSON files from the assets directory.
     * @override
     * @returns {Promise<void>}
     */
    protected async prepare(): Promise<void> {
        this.provinces = await jsonfile.readFile(getAssetPath('provinces.json'));
        this.districts = await jsonfile.readFile(getAssetPath('districts.json'));
        this.wards = await jsonfile.readFile(getAssetPath('wards.json'));
    }

    /**
     * @description Ensures all data files were successfully loaded.
     * @override
     * @returns {Promise<void>}
     */
    protected async validate(): Promise<void> {
        if (!this.provinces.length) throw new Error('No province data found');
        if (!this.districts.length) throw new Error('No district data found');
        if (!this.wards.length) throw new Error('No ward data found');
    }

    /**
     * @description Upserts all location entities into the database.
     * @override
     * @returns {Promise<void>}
     */
    protected async seed(): Promise<void> {
        // Seed Provinces
        await Promise.all(
            this.provinces.map((item: any) =>
                provinceModel.findOneAndReplace({ _id: item._id }, item, { upsert: true, new: true })
            )
        );
        console.log('    ✓ Provinces');

        // Seed Districts
        await Promise.all(
            this.districts.map((item: any) =>
                districtModel.findOneAndReplace({ _id: item._id }, item, { upsert: true, new: true })
            )
        );
        console.log('    ✓ Districts');

        // Seed Wards
        await Promise.all(
            this.wards.map((item: any) =>
                wardModel.findOneAndReplace({ _id: item._id }, item, { upsert: true, new: true })
            )
        );
        console.log('    ✓ Wards');
    }
}

// Export a singleton instance
export const locationSeeder = new LocationSeeder();
