/**
 * @file rbac.seeder.ts
 * @description Seeder for Role-Based Access Control (RBAC) — resources and roles.
 */

import { Resources } from '@/enums/rbac.enum.js';
import {
    findOneAndUpdateResource,
    findOneAndUpdateRole
} from '@/models/repository/rbac/index.js';
import { seederDataManager } from './data/index.js';
import type { IRBACRoleData } from './data/rbac.data.js';
import { Seeder } from './seeder.js';

/* ---------------------------------------------------------- */
/*                        RBAC Seeder                         */
/* ---------------------------------------------------------- */

/**
 * Seeder implementation for RBAC.
 * Upserts all resources from the enum, then upserts role definitions
 * from `rbac.data.ts`, resolving resource names to database IDs.
 */
class RBACSeeder extends Seeder {
    private roles: IRBACRoleData[] = [];

    /** Map of resource name → database ObjectId, populated during seed */
    private resourceIdMap = new Map<string, any>();

    constructor() {
        super('RBAC');
    }

    /**
     * @description Loads role definitions from the data manager.
     * @override
     * @returns {Promise<void>}
     */
    protected async prepare(): Promise<void> {
        this.roles = seederDataManager.table<IRBACRoleData>('rbac')?.getAll() || [];
    }

    /**
     * @description Ensures role data was loaded.
     * @override
     * @returns {Promise<void>}
     */
    protected async validate(): Promise<void> {
        if (!this.roles.length) throw new Error('No RBAC role data found');
    }

    /**
     * @description Upserts resources first, then roles with resolved resource IDs.
     * @override
     * @returns {Promise<void>}
     */
    protected async seed(): Promise<void> {
        await this.seedResources();
        await this.seedRoles();
    }

    /* ---------------------------------------------------------- */
    /*                     Seed Resources                         */
    /* ---------------------------------------------------------- */

    /**
     * @description Upsert all resource entries from the Resources enum.
     * @returns {Promise<void>}
     */
    private async seedResources(): Promise<void> {
        const resources = Object.values(Resources);

        await Promise.all(
            resources.map(async (resource) => {
                const doc = await findOneAndUpdateResource({
                    query: { resource_name: resource },
                    update: { resource_name: resource },
                    options: { upsert: true, new: true }
                });
                this.resourceIdMap.set(resource, doc._id);
            })
        );

        console.log('    ✓ Resources');
    }

    /* ---------------------------------------------------------- */
    /*                       Seed Roles                           */
    /* ---------------------------------------------------------- */

    /**
     * @description Upsert all role definitions, replacing resource names with DB IDs.
     * @returns {Promise<void>}
     */
    private async seedRoles(): Promise<void> {
        for (const role of this.roles) {
            // Resolve resource names → ObjectIds
            const resolvedGrants = role.role_granted.map((grant) => ({
                resource: this.resourceIdMap.get(grant.resource),
                actions: grant.actions,
                attributes: grant.attributes
            }));

            await findOneAndUpdateRole({
                query: { role_name: role.role_name },
                update: {
                    role_name: role.role_name,
                    role_desc: role.role_desc,
                    role_status: role.role_status,
                    role_granted: resolvedGrants
                },
                options: { upsert: true, new: true }
            });

            console.log(`    ✓ Role: ${role.role_name}`);
        }
    }
}

// Export a singleton instance
export const rbacSeeder = new RBACSeeder();
