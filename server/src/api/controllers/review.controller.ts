import { OkResponse } from '@/response/success.response';
import reviewService from '@/services/review.service';
import { RequestWithBody, RequestWithParams, RequestWithQuery } from '@/types/request';
import { CreateReviewSchema } from '@/validations/zod/review.zod';
import { findOneShop } from '@/models/repository/shop';

export default new class ReviewController {
    /* ---------------------------------------------------------- */
    /*                        Create review                       */
    /* ---------------------------------------------------------- */
    createReview: RequestWithBody<CreateReviewSchema> = async (req, res, _next) => {
        new OkResponse({
            message: 'Review created successfully',
            metadata: await reviewService.createReview(req.userId!, req.body)
        }).send(res);
    }


    /* ---------------------------------------------------------- */
    /*                    Get reviews by ORDER                    */
    /* ---------------------------------------------------------- */
    getReviewsByOrderId: RequestWithParams<{ orderId: string }> = async (req, res, _next) => {
        new OkResponse({
            message: 'Reviews fetched successfully',
            metadata: await reviewService.getReviewsByOrderId(req.params.orderId, req.userId!)
        }).send(res);
    }

    /* ---------------------------------------------------------- */
    /*                   Get last review by SKU                   */
    /* ---------------------------------------------------------- */
    getLastReviewBySkuId: RequestWithParams<{ skuId: string }> = async (req, res, _next) => {
        new OkResponse({
            message: 'Last review fetched successfully',
            metadata: await reviewService.getLastReviewBySkuId(req.params.skuId, req.userId!)
        }).send(res);
    }

    /* ---------------------------------------------------------- */
    /*                Get reviews by SKU with statistics          */
    /* ---------------------------------------------------------- */
    getReviewsBySkuId: RequestWithParams<{ skuId: string }> = async (req, res, _next) => {
        new OkResponse({
            message: 'Reviews with statistics fetched successfully',
            metadata: await reviewService.getReviewsBySkuId(req.params.skuId)
        }).send(res);
    }

    /* ---------------------------------------------------------- */
    /*              Get reviews by shop with pagination           */
    /* ---------------------------------------------------------- */
    getReviewsByShop: RequestWithQuery<{
        page?: string;
        limit?: string;
        rating?: string;
        sortBy?: string;
        sortType?: string;
    }> = async (req, res, _next) => {
        // Get shop info from user
        const shop = await findOneShop({
            query: { shop_userId: req.userId! },
            options: { lean: true }
        });

        if (!shop) {
            throw new Error('Shop not found');
        }

        // Parse query parameters
        const options = {
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 10,
            rating: req.query.rating ? parseInt(req.query.rating) : undefined,
            sortBy: (req.query.sortBy as 'createdAt' | 'review_rating') || 'createdAt',
            sortType: (req.query.sortType as 'asc' | 'desc') || 'desc'
        };

        new OkResponse({
            message: 'Shop reviews fetched successfully',
            metadata: await reviewService.getReviewsByShopId(shop._id.toString(), options)
        }).send(res);
    }

    /* ---------------------------------------------------------- */
    /*           Get reviews by shop ID (Public)                  */
    /* ---------------------------------------------------------- */
    getReviewsByShopId: RequestWithParams<{ shopId: string }> & RequestWithQuery<{
        page?: string;
        limit?: string;
        rating?: string;
        sortBy?: string;
        sortType?: string;
    }> = async (req, res, _next) => {
        const { shopId } = req.params;

        // Parse query parameters
        const options = {
            page: req.query.page ? parseInt(req.query.page as string) : 1,
            limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
            rating: req.query.rating ? parseInt(req.query.rating as string) : undefined,
            sortBy: (req.query.sortBy as 'createdAt' | 'review_rating') || 'createdAt',
            sortType: (req.query.sortType as 'asc' | 'desc') || 'desc'
        };

        new OkResponse({
            message: 'Shop reviews fetched successfully',
            metadata: await reviewService.getReviewsByShopId(shopId, options)
        }).send(res);
    }
}