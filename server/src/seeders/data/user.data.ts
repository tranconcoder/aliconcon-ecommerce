import { RoleNames } from '@/enums/rbac.enum.js';
import { SeederDataRow, seederDataManager } from './index.js';

export interface IUserData {
    _id: string;
    user_fullName: string;
    user_email: string;
    password: string;
    role_name: RoleNames;
    user_status: string;
    user_avatar: string;
    user_date_of_birth: string | Date;
    user_sex: boolean;
    phoneNumber: string;
    user_address: string;
    is_email_verified: boolean;
    is_phone_verified: boolean;
}

class UserData extends SeederDataRow<IUserData> {
    protected titles: (keyof IUserData)[] = [
        '_id',
        'user_fullName',
        'user_email',
        'password',
        'role_name',
        'user_status',
        'user_avatar',
        'user_date_of_birth',
        'user_sex',
        'phoneNumber',
        'user_address',
        'is_email_verified',
        'is_phone_verified'
    ];

    protected rawData = [
        // _id                      | user_fullName | user_email          | password      | role_name      | user_status | user_avatar | user_date_of_birth | user_sex | phoneNumber  | user_address     | is_email_verified | is_phone_verified
        ['000000000000000000000001', 'Shop Owner',   'shop@example.com',   '123456789aA@', RoleNames.SHOP,  'active',    '',          '1990-01-01',        true,     '0123456789', '123 Shop St',    true,              true],
        ['000000000000000000000002', 'Client User',  'client@example.com', '123456789aA@', RoleNames.USER,  'active',    '',          '1995-05-05',        false,    '0987654321', '456 Client Rd',  true,              true],
        ['000000000000000000000003', 'System Admin', 'admin@example.com',  '123456789aA@', RoleNames.ADMIN, 'active',    '',          '1985-12-12',        true,     '0112233445', '789 Admin Blvd', true,              true]
    ];

    constructor() {
        super();
        seederDataManager.register('users', this);
    }

    public override getData(): IUserData[] {
        return super.getData().map((u) => ({
            ...u,
            user_date_of_birth: new Date(u.user_date_of_birth)
        }));
    }
}

export const userDataInstance = new UserData();
