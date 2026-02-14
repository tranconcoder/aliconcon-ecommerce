import categoryModel from '@/models/category.model.js';
import {
    findCategories,
    findCategoryById,
    findOneAndUpdateCategory
} from '@/models/repository/category/index.js';
import { BadRequestErrorResponse } from '@/response/error.response.js';
import { get$SetNestedFromObject } from '@/utils/mongoose.util.js';
import mongoose from 'mongoose';

export default new (class CategoryService {
    /* ---------------------------------------------------------- */
    /*                           Create                           */
    /* ---------------------------------------------------------- */
    async createCategory(payload: service.category.arguments.CreateCategory) {
        const newCategory = await categoryModel.create({ ...payload });

        if (!newCategory) {
            throw new BadRequestErrorResponse({ message: 'Failed to create category' });
        }

        return newCategory;
    }

    /* ---------------------------------------------------------- */
    /*                             Get                            */
    /* ---------------------------------------------------------- */

    /* ------------------- Get all categories ------------------- */
    async getAllCategories(active?: boolean) {
        const query: any = { is_deleted: false };
        if (active !== undefined) {
            query.is_active = active;
        }

        return await findCategories({ query });
    }

    /* ---------------------------------------------------------- */
    /*                           Update                           */
    /* ---------------------------------------------------------- */
    async updateCategory(payload: service.category.arguments.UpdateCategory) {
        const { _id, ...others } = payload;
        const { category_parent } = others;

        if (Object.keys(others).length === 0) {
            throw new BadRequestErrorResponse({ message: 'Payload is required!' });
        }

        const category = await findCategoryById({ id: _id, options: { lean: true } });
        if (!category) {
            throw new BadRequestErrorResponse({ message: 'Category not found!' });
        }

        /* ------------------ Check parent category ----------------- */
        if (category_parent) {
            const catgoryParent = await findCategoryById({ id: category_parent });
            if (!catgoryParent)
                throw new BadRequestErrorResponse({ message: 'Category parent not found!' });
        }

        let $set = {};
        get$SetNestedFromObject(payload, $set);

        return findOneAndUpdateCategory({
            query: { _id: new mongoose.Types.ObjectId(payload._id) },
            update: { $set },
            options: { new: true, lean: true }
        });
    }

    async activeCategory(categoryId: string) {
        return await findOneAndUpdateCategory({
            query: {
                _id: new mongoose.Types.ObjectId(categoryId),
                is_deleted: false
            },
            update: { is_active: true },
            options: { new: true, lean: true }
        });
    }

    async unActiveCategory(categoryId: string) {
        return await findOneAndUpdateCategory({
            query: {
                _id: new mongoose.Types.ObjectId(categoryId),
                is_deleted: false
            },
            update: { is_active: false },
            options: { new: true, lean: true }
        });
    }

    /* ---------------------------------------------------------- */
    /*                           Delete                           */
    /* ---------------------------------------------------------- */
    async deleteCategory(categoryId: string) {
        return await findOneAndUpdateCategory({
            query: {
                _id: new mongoose.Types.ObjectId(categoryId),
                is_deleted: false
            },
            update: { is_deleted: true, deleted_at: new Date() },
            options: { new: true, lean: true }
        });
    }
})();
