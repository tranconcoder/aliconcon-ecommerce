import ErrorResponse, {
    ForbiddenErrorResponse,
    NotFoundErrorResponse,
    UnauthorizedErrorResponse
} from '@/response/error.response.js';
import catchError from './catchError.middleware.js';
import JwtService from '@/services/jwt.service.js';
import KeyTokenService from '@/services/keyToken.service.js';

export const authenticate = catchError(async (req, _, next) => {
    if (req.userId) return next();

    /* -------------- Get token from header ------------- */
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(' ').at(1);
    if (!accessToken)
        throw new UnauthorizedErrorResponse({
            message: 'Token not found!'
        });

    /* --------------- Parse token payload -------------- */
    const payloadParsed = JwtService.parseJwtPayload(accessToken);
    if (!payloadParsed)
        throw new UnauthorizedErrorResponse({
            message: 'Invalid token payload!'
        });

    /* ------------ Check key token is valid ------------- */
    const keyToken = await KeyTokenService.findTokenByUserId(payloadParsed.id);
    if (!keyToken)
        throw new UnauthorizedErrorResponse({
            message: 'Invalid token!'
        });

    /* -------------------- Verify token ------------------- */
    const payload = await JwtService.verifyJwt({
        token: accessToken,
        publicKey: keyToken.public_key
    });
    if (!payload)
        throw new UnauthorizedErrorResponse({
            message: 'Token is expired or invalid!'
        });

    /* --------------- Attach payload to req ------------ */
    req.userId = payload.id;
    req.role = payload.role as string;

    next();
});

export const authenticateNotRequired = catchError(async (req, _, next) => {
    /* -------------- Get token from header ------------- */
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(' ').at(1);
    if (!accessToken) return next();

    /* --------------- Parse token payload -------------- */
    const payloadParsed = JwtService.parseJwtPayload(accessToken);
    if (!payloadParsed) return next();

    /* ------------ Check key token is valid ------------- */
    const keyToken = await KeyTokenService.findTokenByUserId(payloadParsed.id);
    if (!keyToken) return next();

    /* -------------------- Verify token ------------------- */
    const payload = await JwtService.verifyJwt({
        token: accessToken,
        publicKey: keyToken.public_key
    });
    if (!payload) return next();

    /* --------------- Attach payload to req ------------ */
    req.userId = payload.id;
    req.role = payload.role;

    next();
});
