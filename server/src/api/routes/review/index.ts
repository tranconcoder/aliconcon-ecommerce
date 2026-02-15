import { validateParamsId } from '@/configs/joi.config';
import reviewController from '@/controllers/review.controller';
import catchError from '@/middlewares/catchError.middleware';
import { authenticate } from '@/middlewares/jwt.middleware';
import { validateCreateReview } from '@/validations/zod/review.zod';
import { Router } from 'express';

const reviewRoute = Router();


/* ----------------------- Create review ----------------------- */
reviewRoute.post(
    "/create",
    authenticate,
    validateCreateReview,
    catchError(reviewController.createReview)
);

/* ------------------ Get reviews by order ------------------ */
reviewRoute.get(
    "/order/:orderId",
    authenticate,
    validateParamsId("orderId"),
    catchError(reviewController.getReviewsByOrderId)
);

/* ------------------ Get last review by SKU ------------------ */
reviewRoute.get(
    "/sku/:skuId",
    validateParamsId("skuId"),
    catchError(reviewController.getLastReviewBySkuId)
);

/* ------------------ Get reviews by SKU with statistics ------------------ */
reviewRoute.get(
    "/sku/:skuId/all",
    validateParamsId("skuId"),
    catchError(reviewController.getReviewsBySkuId)
);

/* ------------------ Get reviews by shop with pagination ------------------ */
reviewRoute.get(
    "/shop/own",
    authenticate,
    catchError(reviewController.getReviewsByShop)
);

/* ------------------ Get reviews by shop ID (Public) ------------------ */
reviewRoute.get(
    "/shop/:shopId",
    validateParamsId("shopId"),
    catchError(reviewController.getReviewsByShopId)
);

export default reviewRoute;