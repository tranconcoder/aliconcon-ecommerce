/**
 * @file index.ts
 * @description Central entry point for all seeders. Manages seeder registration and mapping.
 */

// Ensure all data files are loaded (side-effect imports for registration)
import './data/rbac.data.js';
import './data/category.data.js';
import './data/user.data.js';
import './data/shop.data.js';
import './data/spu.data.js';
import './data/sku.data.js';

// Re-export core classes
export { Seeder } from './seeder.js';
export { seederDataManager, SeederDataRow, SeederDataTable, SeederDataManager } from './data/index.js';

/* ---------------------------------------------------------- */
/*                     Seeder Instances                       */
/* ---------------------------------------------------------- */

import { rbacSeeder } from './rbac.seeder.js';
import { locationSeeder } from './location.seeder.js';
import { categorySeeder } from './category.seeder.js';
import { userSeeder } from './user.seeder.js';
import { shopSeeder } from './shop.seeder.js';
import { spuSeeder } from './spu.seeder.js';
import { skuSeeder } from './sku.seeder.js';

/* ---------------------------------------------------------- */
/*                      Seeder Mapper                         */
/* ---------------------------------------------------------- */

import { Seeder } from './seeder.js';

/** 
 * Key-value lookup for running a single seeder by name.
 * Used primarily by the `seed.ts` script.
 */
export const seederMap: Record<string, Seeder> = {
    rbac: rbacSeeder,
    category: categorySeeder,
    location: locationSeeder,
    user: userSeeder,
    shop: shopSeeder,
    spu: spuSeeder,
    sku: skuSeeder,
};

/** 
 * Ordered list for running all seeders sequentially.
 * Used primarily by the `seed-all.ts` script.
 */
export const seederOrder: Seeder[] = [
    rbacSeeder,
    categorySeeder,
    locationSeeder,
    userSeeder,
    shopSeeder,
    spuSeeder,
    skuSeeder,
];
