import bytes from 'bytes';
import path from 'path';

/* ---------------------------------------------------------- */
/*                           Avatar                           */
/* ---------------------------------------------------------- */
export const AVATAR_MAX_SIZE = bytes.parse('5MB') as number;

export const AVATAR_BASE_PATH = path.join(import.meta.dirname, '../../public/avatars');

/* ---------------------------------------------------------- */
/*                          Category                          */
/* ---------------------------------------------------------- */
export const CATEGORY_MAX_SIZE = bytes.parse('5MB') as number;

export const CATEGORY_BASE_PATH = path.join(import.meta.dirname, '../../public/categories');

export const CATEGORY_INIT_BASE_PATH = path.join(
    import.meta.dirname,
    '../api/assets/images/categories'
);

/* ---------------------------------------------------------- */
/*                            Shop                            */
/* ---------------------------------------------------------- */
export const SHOP_INIT_BASE_PATH = path.join(
    import.meta.dirname,
    '../api/assets/images/shops'
);

/* ---------------------------------------------------------- */
/*                             SPU                            */
/* ---------------------------------------------------------- */
export const SPU_MAX_SIZE = bytes.parse('5MB') as number;

export const SPU_BASE_PATH = path.join(import.meta.dirname, '../../public/products');
