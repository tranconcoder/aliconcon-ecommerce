// Libs
import bcrypt from 'bcrypt';
import _ from 'lodash';

// Handle error
import {
    NotFoundErrorResponse,
    ForbiddenErrorResponse,
    ConflictErrorResponse,
    BadRequestErrorResponse
} from '@/response/error.response.js';

// Configs
import { BCRYPT_SALT_ROUND } from '@/configs/bcrypt.config.js';

// Services
import UserService from './user.service.js';
import KeyTokenService from './keyToken.service.js';
import JwtService from './jwt.service.js';
import LoggerService from './logger.service.js';
import locationService from './location.service.js';

// Models
import { findOneShop, isExistsShop } from '@/models/repository/shop/index.js';
import shopModel from '@/models/shop.model.js';
import { getRoleIdByName } from '@/models/repository/rbac/index.js';
import { findOneAndUpdateUser, findOneUser, findUserById } from '@/models/repository/user/index.js';
import { RoleNames } from '@/enums/rbac.enum.js';
import { UserStatus } from '@/enums/user.enum.js';
import { deleteKeyToken } from './redis.service.js';
import { findOneAndUpdateKeyToken } from '@/models/repository/keyToken/index.js';
import { USER_PUBLIC_FIELDS } from '@/configs/user.config.js';
import { roleService } from './rbac.service.js';
import { changeMediaOwner } from '@/models/repository/media/index.js';
import { NODE_ENV } from '@/configs/server.config.js';
import warehousesService from './warehouses.service.js';

export default class AuthService {
    /* ------------------------------------------------------ */
    /*                        Sign up                         */
    /* ------------------------------------------------------ */
    public static signUp = async ({
        phoneNumber,
        password,
        user_email,
        user_fullName
    }: service.auth.arguments.SignUp) => {
        /* --------------- Check if user is exists -------------- */
        const userIsExist = await UserService.checkUserExist({
            $or: [{ phoneNumber }, { user_email }]
        });
        if (userIsExist) throw new ConflictErrorResponse({ message: 'User is exists!' });

        /* ------------- Save new user to database ------------ */
        const hashPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUND);

        let userRole = RoleNames.USER;

        /* ---------------------------------------------------------- */
        /*                             Dev                            */
        /* ---------------------------------------------------------- */
        if (NODE_ENV === 'development' && phoneNumber === '0327781162') userRole = RoleNames.ADMIN;

        const userInstance = UserService.newInstance({
            phoneNumber,
            password: hashPassword,

            user_email,
            user_avatar: '',
            user_fullName,
            user_role: await getRoleIdByName(userRole),
            user_sex: false
        });
        if (!userInstance) throw new ForbiddenErrorResponse({ message: 'Create user failed!' });

        /* ------------ Generate key and jwt token ------------ */
        const { privateKey, publicKey } = KeyTokenService.generateTokenPair();
        const jwtTokenPair = await JwtService.signJwtPair({
            privateKey,
            payload: {
                id: userInstance.id,
                role: userInstance.user_role.toString()
            }
        });
        if (!jwtTokenPair)
            throw new ForbiddenErrorResponse({ message: 'Generate jwt token failed!' });

        /* ------------ Save key token to database ------------ */
        await Promise.all([
            UserService.saveInstance(userInstance),
            KeyTokenService.findOneAndReplace({
                userId: userInstance.id,
                privateKey,
                publicKey,
                refreshToken: jwtTokenPair.refreshToken
            })
        ]).catch(async () => {
            await KeyTokenService.deleteKeyTokenByUserId(userInstance.id);
            await UserService.removeUser(userInstance.id);

            throw new ForbiddenErrorResponse({ message: 'Error on save user or key token!' });
        });

        return {
            token: jwtTokenPair,
            user: _.pick(userInstance.toObject(), [
                '_id',
                'phoneNumber',
                'user_fullName',
                'user_email',
                'user_role'
            ])
        };
    };

    /* ---------------------------------------------------------- */
    /*                        Sign up shop                        */
    /* ---------------------------------------------------------- */
    public static signUpShop = async ({ mediaId, ...payload }: service.shop.arguments.SignUp) => {
        /* ---------- Check user is register shop account  ---------- */
        const isRegistered = await findOneShop({
            query: { shop_userId: payload.shop_userId }
        }).lean();
        if (isRegistered)
            throw new BadRequestErrorResponse({ message: 'Your account already is shop!' });

        /* ------------------ Check unique fields  ------------------ */
        const checkKeys: Array<keyof typeof payload> = [
            'shop_certificate',
            'shop_email',
            'shop_name',
            'shop_owner_cardID',
            'shop_phoneNumber'
        ];
        const isExists = await isExistsShop(_.pick(payload, checkKeys) as any);
        if (isExists) {
            const conflictFields = checkKeys.filter((key: any) => {
                if (key in isExists) {
                    const sourceValue = payload[key as keyof typeof payload];
                    const targetValue = isExists[key as keyof typeof isExists];

                    return sourceValue === targetValue;
                }
            });

            throw new NotFoundErrorResponse({
                message: 'Fields is exists!',
                metadata: { conflictFields }
            });
        }

        /* ------------------- Save location shop ------------------- */
        const shopLocation = await locationService.createLocation({
            wardId: payload.shop_location.ward,
            districtId: payload.shop_location.district,
            provinceId: payload.shop_location.province,
            address: payload.shop_location.address
        });

        /* --------- Handle create shop warehouses location --------- */
        await Promise.all(
            payload.warehouses.map(async (warehouse) => {
                const warehouseDoc = await warehousesService.createWarehouses({
                    name: warehouse.name,
                    phoneNumber: warehouse.phoneNumber,
                    stock: 0,
                    location: {
                        wardId: warehouse.address.ward,
                        districtId: warehouse.address.district,
                        provinceId: warehouse.address.province,
                        address: warehouse.address.address
                    },
                    shop: payload.shop_userId
                });

                return warehouseDoc.id;
            })
        );

        /* -------------------- Update user role -------------------- */
        const user = await findOneAndUpdateUser({
            query: { _id: payload.shop_userId },
            update: { user_role: await getRoleIdByName(RoleNames.SHOP) },
            options: { new: true }
        });
        if (!user)
            throw new NotFoundErrorResponse({ message: 'Can not change user type to shop!' });
        const userId = user._id.toString();

        /* ------------------- Generate jwt token ------------------- */
        const { privateKey, publicKey } = KeyTokenService.generateTokenPair();
        const jwtTokenPair = await JwtService.signJwtPair({
            privateKey,
            payload: { id: userId, role: user.user_role.toString() }
        });
        if (!jwtTokenPair)
            throw new ForbiddenErrorResponse({ message: 'Generate jwt token failed!' });

        await KeyTokenService.findOneAndReplace({
            userId,
            privateKey,
            publicKey,
            refreshToken: jwtTokenPair.refreshToken
        });

        /* --------------- Change media owner to user --------------- */
        await changeMediaOwner({ userId, mediaId });

        /* -------------------- Handle save shop -------------------- */
        const shop = await shopModel.create({
            shop_userId: payload.shop_userId,
            shop_certificate: payload.shop_certificate,
            shop_email: payload.shop_email,
            shop_location: shopLocation.id,
            shop_logo: payload.shop_logo,
            shop_name: payload.shop_name,
            shop_owner_cardID: payload.shop_owner_cardID,
            shop_owner_email: payload.shop_owner_email,
            shop_owner_fullName: payload.shop_owner_fullName,
            shop_owner_phoneNumber: payload.shop_owner_phoneNumber,
            shop_phoneNumber: payload.shop_phoneNumber,
            shop_status: payload.shop_status,
            shop_type: payload.shop_type,
            shop_description: payload.shop_description,
            is_brand: payload.is_brand
        });

        return { shop, user: user.toObject(), token: jwtTokenPair };
    };

    /* ------------------------------------------------------ */
    /*                         Login                          */
    /* ------------------------------------------------------ */
    public static login = async ({ phoneNumber, password }: service.auth.arguments.Login) => {
        /* -------------- Check if user is exists ------------- */
        const user = await findOneUser({
            query: { phoneNumber },
            select: ['password'],
            options: { lean: true }
        });
        if (!user)
            throw new NotFoundErrorResponse({ message: 'Username or password is not correct!' });

        /* ------------------ Check password ------------------ */
        const hashPassword = user.password;
        const isPasswordMatch = await bcrypt.compare(password, hashPassword);
        if (!isPasswordMatch)
            throw new ForbiddenErrorResponse({ message: 'Username or password is not correct!' });

        /* --------- Generate token and send response --------- */
        const { privateKey, publicKey } = KeyTokenService.generateTokenPair();
        const jwtPair = await JwtService.signJwtPair({
            privateKey,
            payload: {
                id: user._id.toString(),
                role: user.user_role.toString()
            }
        });
        if (!jwtPair) throw new ForbiddenErrorResponse({ message: 'Generate jwt token failed!' });

        /* ---------------- Save new key token ---------------- */
        const keyTokenId = await KeyTokenService.findOneAndReplace({
            userId: user._id.toString(),
            privateKey,
            publicKey,
            refreshToken: jwtPair.refreshToken
        });
        if (!keyTokenId) throw new ForbiddenErrorResponse({ message: 'Save key token failed!' });

        const result: commonTypes.object.ObjectAnyKeys = {
            token: jwtPair,
            user: _.pick(user, USER_PUBLIC_FIELDS)
        };

        /* --------------------- Add role data  --------------------- */
        const roleData = await roleService.getUserRoleData({
            userId: user._id.toString(),
            roleId: user.user_role.toString()
        });
        if (roleData && roleData.role_name !== RoleNames.USER)
            result[roleData.role_name] = roleData.role_data || true;

        return result;
    };

    /* ------------------------------------------------------ */
    /*                         Logout                         */
    /* ------------------------------------------------------ */
    public static logout = async (userId: string) => {
        /* ----- Handle remove refresh token in valid list ---- */
        await KeyTokenService.deleteKeyTokenByUserId(userId);
        await deleteKeyToken(userId);

        return true;
    };

    /* ------------------------------------------------------ */
    /*                         Forgot password                */
    /* ------------------------------------------------------ */
    public static forgotPassword = async ({ email, newPassword }: service.auth.arguments.ForgotPassword) => {
        const user = await findOneUser({
            query: { user_email: email },
            options: { lean: true }
        });
        if (!user) throw new NotFoundErrorResponse({ message: 'User not found' });

        const hashPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUND);

        await findOneAndUpdateUser({
            query: { user_email: email },
            update: { password: hashPassword }
        });

        /* ----------------- Logout all user's token ---------------- */
        await KeyTokenService.deleteKeyTokenByUserId(user._id.toString());

        return true;
    };

    /* ------------------------------------------------------ */
    /*                  Handle refresh token                  */
    /* ------------------------------------------------------ */
    public static newToken = async ({ refreshToken }: service.auth.arguments.NewToken) => {
        /* -------------- Get user info in token -------------- */
        const payload = JwtService.parseJwtPayload(refreshToken);
        if (!payload)
            throw new ForbiddenErrorResponse({ message: 'Token is not generate by server!' });

        /* ------------- Find key token by user id ------------ */
        const keyToken = await KeyTokenService.findTokenByUserId(payload.id);
        if (!keyToken) throw new NotFoundErrorResponse({ message: 'Key token not found!' });

        /* ---------- Check refresh is current token ---------- */
        const isRefreshTokenUsed = keyToken.refresh_tokens_used?.includes(refreshToken);

        // Token is valid but it was deleted on valid list (because token was used before to get new token)
        if (isRefreshTokenUsed) {
            // ALERT: Token was stolen!!!
            // Clean up keyToken
            await KeyTokenService.deleteKeyTokenByUserId(payload.id);
            await deleteKeyToken(payload.id);

            LoggerService.getInstance().error(`Token was stolen! User id: ${payload.id}`);

            throw new ForbiddenErrorResponse({ message: 'Token was deleted!' });
        }

        /* --------------- Verify refresh token --------------- */
        const decoded = await JwtService.verifyJwt({
            publicKey: keyToken.public_key,
            token: refreshToken
        });
        if (!decoded) throw new ForbiddenErrorResponse({ message: 'Token is invalid!' });
        if (refreshToken !== keyToken.refresh_token)
            throw new ForbiddenErrorResponse({ message: 'Token is invalid!' });

        /* ------------ Generate new jwt token pair ----------- */
        const user = await findUserById({ id: decoded.id });
        const { privateKey, publicKey } = KeyTokenService.generateTokenPair();
        const newJwtTokenPair = await JwtService.signJwtPair({
            privateKey,
            payload: {
                id: user._id.toString(),
                role: user.user_role.toString()
            }
        });
        if (!newJwtTokenPair)
            throw new ForbiddenErrorResponse({ message: 'Generate token failed!' });

        const newKeyToken = await findOneAndUpdateKeyToken({
            query: { user: payload.id },
            update: {
                private_key: privateKey,
                public_key: publicKey,
                refresh_token: newJwtTokenPair.refreshToken,
                $push: { refresh_tokens_used: refreshToken }
            },
            options: { new: true }
        });
        if (!newKeyToken) throw new ForbiddenErrorResponse({ message: 'Save key token failed!' });

        const result: commonTypes.object.ObjectAnyKeys = {
            token: newJwtTokenPair,
            user: _.pick(user, USER_PUBLIC_FIELDS)
        };

        /* --------------------- Add role data  --------------------- */
        const roleData = await roleService.getUserRoleData({
            userId: user._id.toString(),
            roleId: user.user_role.toString()
        });
        if (roleData && roleData.role_name !== RoleNames.USER)
            result[roleData.role_name] = roleData.role_data || true;

        return result;
    };
    /* ------------------------------------------------------ */
    /*                  Upsert user from Google               */
    /* ------------------------------------------------------ */
    public static upsertUserFromGoogle = async (profile: any) => {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const picture = profile.photos?.[0]?.value;

        // Extended info from profile._json (requires specific scopes)
        const gender = profile._json?.gender; // 'male', 'female', 'other'
        const birthday = profile._json?.birthday; // Often in People API format or similar

        if (!email) throw new BadRequestErrorResponse({ message: 'Email not found from Google profile!' });

        // Check if user exists by email
        let user = await findOneUser({
            query: { user_email: email },
            options: { lean: true }
        });

        if (user) return user;

        // Create new user
        const password = Math.random().toString(36).slice(-8); // Random password
        const hashPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUND);
        
        // Generate random 10 digit phone number (placeholder)
        const phoneNumber = '0' + Math.floor(100000000 + Math.random() * 900000000).toString();

        // Map Google gender to our boolean user_sex (true => male, false => female)
        let user_sex = false;
        if (gender === 'male') user_sex = true;

        // Parse birthday if available
        let user_dayOfBirth: Date | undefined = undefined;
        if (birthday) {
            // Google birthday format can vary, often it's "YYYY/MM/DD" or similar in _json
            // If using People API it might be complex object. 
            // We'll try to parse it safely.
            const parsedDate = new Date(birthday);
            if (!isNaN(parsedDate.getTime())) {
                user_dayOfBirth = parsedDate;
            }
        }

        const newUser = UserService.newInstance({
            phoneNumber,
            password: hashPassword,
            user_email: email,
            user_fullName: name,
            user_avatar: picture,
            user_role: await getRoleIdByName(RoleNames.USER),
            user_status: UserStatus.ACTIVE,
            user_sex,
            user_dayOfBirth
        });

        const savedUser = await UserService.saveInstance(newUser);
        
        return savedUser.toObject();
    };

    /* ------------------------------------------------------ */
    /*                     Create Session                     */
    /* ------------------------------------------------------ */
    public static createSession = async (user: any) => {
        const { privateKey, publicKey } = KeyTokenService.generateTokenPair();
        
        const jwtTokenPair = await JwtService.signJwtPair({
            privateKey,
            payload: {
                id: user._id.toString(),
                role: user.user_role.toString()
            }
        });

        if (!jwtTokenPair) throw new ForbiddenErrorResponse({ message: 'Generate jwt token failed!' });

        await KeyTokenService.findOneAndReplace({
            userId: user._id.toString(),
            privateKey,
            publicKey,
            refreshToken: jwtTokenPair.refreshToken
        });

        return {
            token: jwtTokenPair,
            user: _.pick(user, USER_PUBLIC_FIELDS)
        };
    };
}
