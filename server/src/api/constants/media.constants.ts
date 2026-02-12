import {
    AVATAR_BASE_PATH,
    CATEGORY_BASE_PATH,
    SPU_BASE_PATH
} from '@/configs/media.config.js';
import { getRandomFilename } from '@/utils/multer.util.js';
import fs from 'fs/promises';
import multer from 'multer';

/* ---------------------------------------------------------- */
/*                           Avatar                           */
/* ---------------------------------------------------------- */
export const avatarStorage = multer.diskStorage({
    destination: async (_req, _file, cb) => {
        await fs.mkdir(AVATAR_BASE_PATH, { recursive: true });
        cb(null, AVATAR_BASE_PATH);
    },
    filename: getRandomFilename
});

/* ---------------------------------------------------------- */
/*                          Category                          */
/* ---------------------------------------------------------- */
export const categoryStorage = multer.diskStorage({
    destination: async (_req, _file, cb) => {
        await fs.mkdir(CATEGORY_BASE_PATH, { recursive: true });
        cb(null, CATEGORY_BASE_PATH);
    },
    filename: getRandomFilename
});

/* ---------------------------------------------------------- */
/*                             SPU                            */
/* ---------------------------------------------------------- */
export const spuStorage = multer.diskStorage({
    destination: async (_req, _file, cb) => {
        await fs.mkdir(SPU_BASE_PATH, { recursive: true });
        cb(null, SPU_BASE_PATH);
    },
    filename: getRandomFilename
});
