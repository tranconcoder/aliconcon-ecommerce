import { roleHandleGetDataStrategy } from '@/configs/rbac.config.js';
import { RoleNames } from '@/enums/rbac.enum.js';
import {
    findRoleById,
    findRoles
} from '@/models/repository/rbac/index.js';
import { findUserById } from '@/models/repository/user/index.js';

class RBACService {
    public static instance: RBACService;

    private constructor() { }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new RBACService();
        }

        return this.instance;
    }

    async getAccessControlList() {
        const roles = await findRoles({
            query: {},
            options: { populate: 'role_granted.resource', lean: true }
        });

        const result = roles.flatMap((role) =>
            role.role_granted.flatMap((granted) => {
                const resource = granted.resource as any as model.rbac.ResourceSchema;

                return granted.actions.map((action) => ({
                    role: role.role_name,
                    resource: resource.resource_name,
                    action,
                    attributes: granted.attributes
                }));
            })
        );

        return result;
    }
}

class RoleService {
    async getUserRoleData({ userId, roleId }: service.rbac.arguments.GetUserRoleData) {
        const roleName: RoleNames = await findRoleById({
            id: roleId,
            options: { lean: true }
        }).then((role) => role.role_name);

        if (!roleName) return null;
        if (!roleHandleGetDataStrategy[roleName]) return null;

        return {
            role_name: roleName,
            role_data: await roleHandleGetDataStrategy[roleName](userId)
        };
    }

    async userIsAdmin(userId: string) {
        const user = await findUserById({
            id: userId,
            only: ['user_role'],
            options: { lean: true }
        });
        if (!user) return false;

        const role = await findRoleById({
            id: user.user_role,
            options: { lean: true }
        });
        if (!role) return false;
        if (role.role_name === RoleNames.SUPER_ADMIN) return true;
        if (role.role_name === RoleNames.ADMIN) return true;

        return false;
    }
}

export default RBACService;

export const roleService = new RoleService();
