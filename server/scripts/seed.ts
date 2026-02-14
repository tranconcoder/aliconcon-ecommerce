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
/*                      Available Seeders                     */
/* ---------------------------------------------------------- */
const seeders = {
    rbac: async () => {
        console.log('🌱 Seeding RBAC...');
        await RBACService.getInstance().initRBAC();
        console.log('✅ RBAC seeded successfully');
    },
    media: async () => {
        console.log('🌱 Seeding Media...');
        await mediaService.initMedia();
        console.log('✅ Media seeded successfully');
    },
    category: async () => {
        console.log('🌱 Seeding Categories...');
        await categoryService.initCategory();
        console.log('✅ Categories seeded successfully');
    },
    location: async () => {
        console.log('🌱 Seeding Locations...');
        
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
        
        console.log('✅ Locations seeded successfully');
    },
    user: async () => {
        console.log('🌱 Seeding User...');
        await initUser();
        console.log('✅ User seeded successfully');
    },
    shop: async () => {
        console.log('🌱 Seeding Shop...');
        await initShop();
        console.log('✅ Shop seeded successfully');
    },
    spu: async () => {
        console.log('🌱 Seeding SPU...');
        await initSPU();
        console.log('✅ SPU seeded successfully');
    },
    sku: async () => {
        console.log('🌱 Seeding SKU...');
        await initSKU();
        console.log('✅ SKU seeded successfully');
    }
};

/* ---------------------------------------------------------- */
/*                         Main Script                        */
/* ---------------------------------------------------------- */
async function main() {
    const seederName = process.argv[2];

    if (!seederName) {
        console.error('❌ Error: Please provide a seeder name');
        console.log('\nAvailable seeders:');
        Object.keys(seeders).forEach(name => {
            console.log(`  - ${name}`);
        });
        process.exit(1);
    }

    if (!(seederName in seeders)) {
        console.error(`❌ Error: Seeder "${seederName}" not found`);
        console.log('\nAvailable seeders:');
        Object.keys(seeders).forEach(name => {
            console.log(`  - ${name}`);
        });
        process.exit(1);
    }

    try {
        console.log(`\n🚀 Starting seeder: ${seederName}\n`);
        
        // Wait for database connection
        await MongoDB.getInstance().connect();
        
        // Run the seeder
        await seeders[seederName as keyof typeof seeders]();
        
        console.log(`\n✨ Seeder "${seederName}" completed successfully\n`);
    } catch (error) {
        console.error(`\n❌ Error running seeder "${seederName}":`, error);
        process.exit(1);
    } finally {
        // Close database connection
        await MongoDB.getInstance().disconnect();
        process.exit(0);
    }
}

main();
