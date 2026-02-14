#!/usr/bin/env bun
// Load env
import '../src/api/helpers/loadEnv.helper.js';

import MongoDB from '../src/app/db.app.js';
import { seederOrder } from '@/seeders/index.js';
import { copyAssetsIfMissing } from './utils/copy-assets.js';

/* ---------------------------------------------------------- */
/*                         Main Script                        */
/* ---------------------------------------------------------- */
async function main() {
    try {
        console.log('\n🚀 Starting all seeders in order...\n');
        console.log('═'.repeat(50));

        await copyAssetsIfMissing();
        await MongoDB.getInstance().connect();

        for (const seeder of seederOrder) {
            await seeder.run();
        }

        console.log('\n' + '═'.repeat(50));
        console.log('\n✨ All seeders completed successfully!\n');
    } catch (error) {
        console.error('\n❌ Error running seeders:', error);
        process.exit(1);
    } finally {
        await MongoDB.getInstance().disconnect();
        process.exit(0);
    }
}

main();
