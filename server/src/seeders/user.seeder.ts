/**
 * @file user.seeder.ts
 * @description Seeder for initializing fundamental user accounts and roles.
 */

import { userModel } from '@/models/user.model.js';
import roleModel from '@/models/role.model.js';
import bcrypt from 'bcrypt';
import { seederDataManager } from './data/index.js';
import type { IUserData } from './data/user.data.js';
import { Seeder } from './seeder.js';

/* ---------------------------------------------------------- */
/*                        User Seeder                         */
/* ---------------------------------------------------------- */

/**
 * Seeder implementation for system users.
 * Processes defined users, hashes passwords, and assigns appropriate roles.
 */
class UserSeeder extends Seeder {
    private users: IUserData[] = [];

    constructor() {
        super('User');
    }

    /**
     * @description Retrieves the list of users to seed from the manager.
     * @override
     * @returns {Promise<void>}
     */
    protected async prepare(): Promise<void> {
        this.users = seederDataManager.table<IUserData>('users')?.getAll() || [];
    }

    /**
     * @description Validates that requested roles actually exist in the database.
     * @override
     * @returns {Promise<void>}
     */
    protected async validate(): Promise<void> {
        if (!this.users.length) throw new Error('No user data found');

        // Verify role existence for each user to prevent failures in the seed phase
        for (const user of this.users) {
            const role = await roleModel.findOne({ role_name: (user as any).role_name });
            if (!role) {
                console.warn(`    ⚠ Role "${(user as any).role_name}" not found — user ${user.user_email} will be skipped`);
            }
        }
    }

    /**
     * @description Hashes passwords and upserts user records.
     * @override
     * @returns {Promise<void>}
     */
    protected async seed(): Promise<void> {
        // Generate a common salt for security and consistency during seeding
        const salt = await bcrypt.genSalt(10);

        for (const user of this.users) {
            // Find role ID from name
            const role = await roleModel.findOne({ role_name: (user as any).role_name });
            if (!role) continue; // Skip if role validation failed or was ignored

            // Securely hash the password
            const hashedPassword = await bcrypt.hash(user.password, salt);
            
            // Build the final user payload
            const payload = {
                ...user,
                password: hashedPassword,
                user_role: role._id
            };
            
            // Remove auxiliary fields not present in the database schema
            delete (payload as any).role_name;

            // Perform upsert based on ID
            await userModel.findOneAndUpdate(
                { _id: user._id },
                payload,
                { upsert: true, new: true }
            );
        }
    }
}

// Export a singleton instance
export const userSeeder = new UserSeeder();
