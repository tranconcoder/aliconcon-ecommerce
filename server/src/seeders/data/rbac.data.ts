/**
 * @file rbac.data.ts
 * @description Seed data definitions for RBAC roles and their granted permissions.
 */

import { Resources, RoleActions, RoleNames, RoleStatus } from '@/enums/rbac.enum.js';
import { SeederDataRow, seederDataManager } from './index.js';

/* ---------------------------------------------------------- */
/*                        Interfaces                          */
/* ---------------------------------------------------------- */

/** A single permission grant: which resource, which actions, which attributes. */
export interface IRBACGrant {
    resource: Resources;
    actions: RoleActions[];
    attributes: string;
}

/** A role definition with its name, description, status, and granted permissions. */
export interface IRBACRoleData {
    role_name: RoleNames;
    role_desc: string;
    role_status: RoleStatus;
    role_granted: IRBACGrant[];
}

/* ---------------------------------------------------------- */
/*                      Helper Shortcuts                      */
/* ---------------------------------------------------------- */

/** All CRUD actions on any record */
const ALL_ANY = [RoleActions.CREATE_ANY, RoleActions.READ_ANY, RoleActions.UPDATE_ANY, RoleActions.DELETE_ANY];

/** All CRUD actions on own records only */
const ALL_OWN = [RoleActions.CREATE_OWN, RoleActions.READ_OWN, RoleActions.UPDATE_OWN, RoleActions.DELETE_OWN];

/** Grant helper: full access to a resource (any) */
const grantAny = (resource: Resources): IRBACGrant => ({ resource, actions: ALL_ANY, attributes: '*' });

/** Grant helper: own-only access to a resource */
const grantOwn = (resource: Resources): IRBACGrant => ({ resource, actions: ALL_OWN, attributes: '*' });

/* ---------------------------------------------------------- */
/*                      Role Definitions                      */
/* ---------------------------------------------------------- */

class RBACData extends SeederDataRow<IRBACRoleData> {
    protected titles: (keyof IRBACRoleData)[] = [
        'role_name', 'role_desc', 'role_status', 'role_granted'
    ];

    protected rawData = [
        // role_name                | role_desc               | role_status      | role_granted
        [RoleNames.SUPER_ADMIN,      'Super Administrator',   RoleStatus.ACTIVE, Object.values(Resources).map((r) => grantAny(r))],
        [RoleNames.ADMIN,            'Administrator',         RoleStatus.ACTIVE, [{ resource: Resources.SHOP, actions: [RoleActions.READ_ANY, RoleActions.UPDATE_ANY, RoleActions.DELETE_ANY], attributes: '*' }, grantAny(Resources.CATEGORY)]],
        [RoleNames.SHOP,             'Shop',                  RoleStatus.ACTIVE, [{ resource: Resources.SHOP, actions: [RoleActions.CREATE_OWN, RoleActions.READ_ANY, RoleActions.UPDATE_OWN, RoleActions.DELETE_OWN], attributes: '*' }, grantOwn(Resources.ORDER), grantOwn(Resources.PRODUCT), grantOwn(Resources.WAREHOUSES), grantOwn(Resources.DISCOUNT), { resource: Resources.SHOP_ANALYTICS, actions: [RoleActions.READ_OWN], attributes: '*' }]],
        [RoleNames.USER,             'User role',             RoleStatus.ACTIVE, [grantOwn(Resources.PRODUCT), grantOwn(Resources.ORDER)]]
    ];

    constructor() {
        super();
        seederDataManager.register('rbac', this);
    }
}

export const rbacDataInstance = new RBACData();
