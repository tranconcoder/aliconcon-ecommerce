import { SeederDataRow, seederDataManager } from './index.js';

export interface ISKUData {
    productSlug: string;
    tierIdx: number[];
    price: number;
    stock: number;
    thumb: string;
    images: string[];
}

class SKUData extends SeederDataRow<ISKUData> {
    protected titles: (keyof ISKUData)[] = [
        'productSlug',
        'tierIdx',
        'price',
        'stock',
        'thumb',
        'images'
    ];

    // SKUs are generated dynamically from SPUs
    protected rawData: any[][] = [];

    constructor() {
        super();
        seederDataManager.register('skus', this);
    }
}

export const skuDataInstance = new SKUData();
