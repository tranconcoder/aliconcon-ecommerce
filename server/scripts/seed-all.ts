#!/usr/bin/env bun
// Load env
import '../src/api/helpers/loadEnv.helper';

import MongoDB from '../src/app/db.app.js';
import RBACService from '@/services/rbac.service.js';
import mediaService from '@/services/media.service.js';
import categoryService from '@/services/category.service.js';
import jsonfile from 'jsonfile';
import path from 'path';
import { provinceModel, districtModel, wardModel } from '../src/api/models/location.model.js';
import { initUser } from '@/seeders/user.seeder.js';
import { initShop } from '@/seeders/shop.seeder.js';
import { initSPU } from '@/seeders/spu.seeder.js';
import { initSKU } from '@/seeders/sku.seeder.js';

/* ---------------------------------------------------------- */
/*                    Seeder Execution Order                  */
/* ---------------------------------------------------------- */
const SEEDER_ORDER = [
    {
        name: 'RBAC',
        run: async () => {
            await RBACService.getInstance().initRBAC();
        }
    },
    {
        name: 'Media',
        run: async () => {
            await mediaService.initMedia();
        }
    },
    {
        name: 'Category',
        run: async () => {
            await categoryService.initCategory();
        }
    },
    {
        name: 'Location',
        run: async () => {
            const provinceJsonFile = path.join(import.meta.dirname, '../src/api/assets/provinces.json');
            const districtsJsonFile = path.join(import.meta.dirname, '../src/api/assets/districts.json');
            const wardJsonFile = path.join(import.meta.dirname, '../src/api/assets/wards.json');

            // Seed provinces
            const provinces = await jsonfile.readFile(provinceJsonFile);
            await Promise.all(
                provinces.map(async (item: any) => {
                    return provinceModel.findOneAndReplace(
                        { _id: item._id },
                        item,
                        { upsert: true, new: true }
                    );
                })
            );
            console.log('  ✓ Provinces seeded');

            // Seed districts
            const districts = await jsonfile.readFile(districtsJsonFile);
            await Promise.all(
                districts.map(async (item: any) => {
                    return districtModel.findOneAndReplace(
                        { _id: item._id },
                        item,
                        { upsert: true, new: true }
                    );
                })
            );
            console.log('  ✓ Districts seeded');

            // Seed wards
            const wards = await jsonfile.readFile(wardJsonFile);
            await Promise.all(
                wards.map(async (item: any) => {
                    return wardModel.findOneAndReplace(
                        { _id: item._id },
                        item,
                        { upsert: true, new: true }
                    );
                })
            );
            console.log('  ✓ Wards seeded');
        }
    },
    {
        name: 'User',
        run: async () => {
             await initUser();
        }
    },
    {
        name: 'Shop',
        run: async () => {
             await initShop();
        }
    },
    {
        name: 'SPU',
        run: async () => {
             await initSPU();
        }
    },
    {
        name: 'SKU',
        run: async () => {
             await initSKU();
        }
    }
];

/* ---------------------------------------------------------- */
/*                         Main Script                        */
/* ---------------------------------------------------------- */
async function main() {
    try {
        console.log('\n🚀 Starting all seeders in order...\n');
        console.log('═'.repeat(50));
        
        // Wait for database connection
        await MongoDB.getInstance().connect();
        
        // Run seeders in order
        for (const seeder of SEEDER_ORDER) {
            console.log(`\n🌱 Seeding ${seeder.name}...`);
            await seeder.run();
            console.log(`✅ ${seeder.name} seeded successfully`);
        }
        
        console.log('\n' + '═'.repeat(50));
        console.log('\n✨ All seeders completed successfully!\n');
    } catch (error) {
        console.error('\n❌ Error running seeders:', error);
        process.exit(1);
    } finally {
        // Close database connection
        await MongoDB.getInstance().disconnect();
        process.exit(0);
    }
}

main();
