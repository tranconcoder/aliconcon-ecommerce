import type { RootFilterQuery } from 'mongoose';

import { userModel } from '@/models/user.model.js';
import _ from 'lodash';
import mongoose from 'mongoose';
import { findOneAndUpdateUser, findOneUser, findUserById } from '@/models/repository/user/index.js';
import { roleService } from './rbac.service.js';
import { RoleNames } from '@/enums/rbac.enum.js';
import { findShopById } from '@/models/repository/shop/index.js';
import { BadRequestErrorResponse, NotFoundErrorResponse } from '@/response/error.response.js';
import { ShopStatus } from '@/enums/shop.enum.js';
import { UpdateProfileSchema } from '@/validations/zod/user.zod.js';
import { get$SetNestedFromObject } from '@/utils/mongoose.util.js';
import { deleteUserProfile } from './redis.service.js';

export default class UserService {
    /* -------------------- Get user by id -------------------- */
    public static getUserById = async (id: string) => {
        const user = await findUserById({
            id,
            only: [
                '_id',
                'phoneNumber',
                'user_email',
                'user_role',
                'user_fullName',
                'user_avatar',
                'user_sex',
                'user_status',
                'user_dayOfBirth'
            ]
        });
        if (!user) throw new NotFoundErrorResponse({ message: 'User not found!' });

        const result: commonTypes.object.ObjectAnyKeys = { user };

        /* --------------------- Add role data  --------------------- */
        const roleData = await roleService.getUserRoleData({
            userId: user._id.toString(),
            roleId: user.user_role.toString()
        });

        if (roleData && roleData.role_name !== RoleNames.USER)
            result[roleData.role_name] = roleData.role_data || true;
        else result.user.role_name = RoleNames.USER;

        return result;
    };

    /* -------------------- Get shop info -------------------- */
    public static getShopInfo = async (id: string) => {
        const shop = await findShopById({
            id,
            only: [
                '_id',
                'shop_userId',
                'shop_name',
                'shop_type',
                'shop_logo',
                'shop_location',
                'shop_status',
                'is_brand'
            ],
            options: {
                lean: true,
                populate: [
                    {
                        path: 'shop_location',
                        select: ['province', 'district'],
                        populate: {
                            path: 'province district',
                            select: ['province_name', 'district_name']
                        }
                    }
                ]
            }
        });

        if (!shop) throw new NotFoundErrorResponse({ message: 'Shop not found!' });
        if (shop.is_deleted) throw new NotFoundErrorResponse({ message: 'Shop is deleted!' });
        if (shop.shop_status !== ShopStatus.ACTIVE)
            throw new NotFoundErrorResponse({ message: 'Shop is not active!' });

        return { shop };
    };

    /* -------------------- Update profile -------------------- */
    public static updateProfile = async (id: string, data: UpdateProfileSchema) => {
        const { user_email } = data;

        // Check email exist
        const userExist = await userModel.findOne({ user_email, _id: { $ne: id } });
        if (userExist) throw new BadRequestErrorResponse({ message: 'Email already exists!' });

        // Update user
        const $set: commonTypes.object.ObjectAnyKeys = {};
        get$SetNestedFromObject(data, $set);

        const updatedUser = await findOneAndUpdateUser({
            query: { _id: id },
            update: { $set },
            options: { new: true }
        });

        // Delete redis cache
        await deleteUserProfile(id);

        return updatedUser;
    };

    /* -------------------- New instance -------------------- */
    public static newInstance = (user: service.user.arguments.NewInstance) => {
        return new userModel(user);
    };

    /* -------------------- Save instance -------------------- */
    public static saveInstance = async (user: ReturnType<typeof this.newInstance>) => {
        return await user.save();
    };

    /* -------------------- Find one user -------------------- */
    public static findOne = async (query: RootFilterQuery<model.auth.UserSchema>) => {
        return await findOneUser({ query }).lean();
    };

    /* -------------------- Check user exist -------------------- */
    public static checkUserExist = async (query: RootFilterQuery<model.auth.UserSchema>) => {
        return await userModel.exists(query).lean();
    };

    /* -------------------- Upload avatar -------------------- */
    public static uploadAvatar = async (id: string, mediaId: string) => {
        const user = await findOneAndUpdateUser({
            query: { _id: id },
            update: { $set: { user_avatar: mediaId } },
            options: { new: true }
        });

        // Delete redis cache
        await deleteUserProfile(id);

        return user;
    };

    /* -------------------- Save user -------------------- */
    public static saveUser = async (data: model.auth.UserSchema) => {
        const user = await userModel.create(data);

        return user ? _.pick(user, ['role', 'id']) : null;
    };

    /* ---------------------------------------------------------- */
    /*                           Delete                           */
    /* ---------------------------------------------------------- */
    /* -------------------- Remove user -------------------- */
    public static removeUser = async (id: string) => {
        const result = await userModel.deleteOne({
            _id: new mongoose.Types.ObjectId(id)
        });

        return result.deletedCount > 0;
    };
}
