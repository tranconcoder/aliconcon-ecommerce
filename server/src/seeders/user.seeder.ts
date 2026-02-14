import { userModel } from '@/models/user.model.js';
import roleModel from '@/models/role.model.js';
import { RoleNames } from '@/enums/rbac.enum.js';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

export const USERS = [
    {
        _id: new mongoose.Types.ObjectId('000000000000000000000001'),
        user_fullName: 'Shop Owner',
        user_email: 'shop@example.com',
        password: '123456789aA@',
        role_name: RoleNames.SHOP,
        user_status: 'active',
        user_avatar: '',
        user_date_of_birth: new Date('1990-01-01'),
        user_sex: true, 
        phoneNumber: '0123456789',
        user_address: '123 Shop St',
        is_email_verified: true,
        is_phone_verified: true
    },
    {
        _id: new mongoose.Types.ObjectId('000000000000000000000002'),
        user_fullName: 'Client User',
        user_email: 'client@example.com',
        password: '123456789aA@',
        role_name: RoleNames.USER,
        user_status: 'active',
        user_avatar: '',
        user_date_of_birth: new Date('1995-05-05'),
        user_sex: false, 
        phoneNumber: '0987654321',
        user_address: '456 Client Rd',
        is_email_verified: true,
        is_phone_verified: true
    },
    {
        _id: new mongoose.Types.ObjectId('000000000000000000000003'),
        user_fullName: 'System Admin',
        user_email: 'admin@example.com',
        password: '123456789aA@',
        role_name: RoleNames.ADMIN,
        user_status: 'active',
        user_avatar: '',
        user_date_of_birth: new Date('1985-12-12'),
        user_sex: true, 
        phoneNumber: '0112233445',
        user_address: '789 Admin Blvd',
        is_email_verified: true,
        is_phone_verified: true
    }
];

export const userSeeder = USERS[0];

export const initUser = async () => {
    const salt = await bcrypt.genSalt(10);

    for (const user of USERS) {
        const role = await roleModel.findOne({ role_name: user.role_name });
        if (!role) {
            console.error(`❌ Role ${user.role_name} not found. Skipping user ${user.user_email}`);
            continue;
        }

        const hashedPassword = await bcrypt.hash(user.password, salt);
        
        const payload = {
            ...user,
            password: hashedPassword,
            user_role: role._id
        };

        // Remove role_name from payload as it's not in user schema
        delete (payload as any).role_name;

        await userModel.findOneAndUpdate(
            { _id: user._id },
            payload,
            { upsert: true, new: true }
        );
        console.log(`  ✓ User ${user.user_email} seeded (${user.role_name})`);
    }
};
