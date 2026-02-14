import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { CATEGORY_BASE_PATH, CATEGORY_INIT_BASE_PATH, SPU_BASE_PATH } from '@/configs/media.config.js';

/**
 * Copies assets from source to destination if they are missing.
 */
export const copyAssetsIfMissing = async () => {
    console.log('📂 Checking for missing assets in public folder...');

    const SPU_INIT_BASE_PATH = path.join(import.meta.dirname, '../../src/api/assets/images/products');

    const copyTasks = [
        {
            src: CATEGORY_INIT_BASE_PATH,
            dest: CATEGORY_BASE_PATH,
            name: 'Category'
        },
        {
            src: SPU_INIT_BASE_PATH,
            dest: SPU_BASE_PATH,
            name: 'Product'
        }
    ];

    for (const task of copyTasks) {
        if (!existsSync(task.src)) {
            console.warn(`  ⚠️ Source directory not found: ${task.src}`);
            continue;
        }

        if (!existsSync(task.dest)) {
            await fs.mkdir(task.dest, { recursive: true });
            console.log(`  📁 Created directory: ${task.dest}`);
        }

        const files = await fs.readdir(task.src);
        let copiedCount = 0;

        for (const file of files) {
            const srcPath = path.join(task.src, file);
            const destPath = path.join(task.dest, file);

            // Skip directories if any
            const stat = await fs.stat(srcPath);
            if (stat.isDirectory()) continue;

            if (!existsSync(destPath)) {
                await fs.copyFile(srcPath, destPath);
                copiedCount++;
            }
        }

        if (copiedCount > 0) {
            console.log(`  ✅ Copied ${copiedCount} missing ${task.name} images to public folder.`);
        } else {
            console.log(`  ℹ️ All ${task.name} images already exist in public folder.`);
        }
    }
};
