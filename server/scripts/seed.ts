import '../src/api/helpers/loadEnv.helper.js';

import MongoDB from '../src/app/db.app.js';
import { seederMap } from '@/seeders/index.js';
import { copyAssetsIfMissing } from './utils/copy-assets.js';

/* ---------------------------------------------------------- */
/*                         Main Script                        */
/* ---------------------------------------------------------- */
async function main() {
    const seederName = process.argv[2];

    if (!seederName) {
        console.error('❌ Error: Please provide a seeder name');
        console.log('\nAvailable seeders:');
        Object.keys(seederMap).forEach(name => {
            console.log(`  - ${name}`);
        });
        process.exit(1);
    }

    if (!(seederName in seederMap)) {
        console.error(`❌ Error: Seeder "${seederName}" not found`);
        console.log('\nAvailable seeders:');
        Object.keys(seederMap).forEach(name => {
            console.log(`  - ${name}`);
        });
        process.exit(1);
    }

    try {
        console.log(`\n🚀 Starting seeder: ${seederName}\n`);

        await copyAssetsIfMissing();
        await MongoDB.getInstance().connect();

        await seederMap[seederName].run();

        console.log(`\n✨ Seeder "${seederName}" completed successfully\n`);
    } catch (error) {
        console.error(`\n❌ Error running seeder "${seederName}":`, error);
        process.exit(1);
    } finally {
        await MongoDB.getInstance().disconnect();
        process.exit(0);
    }
}

main();
