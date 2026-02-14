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

    // SKUs for predefined SPUs
    protected rawData: any[][] = [
        // productSlug              | tierIdx | price    | stock | thumb                                 | images

        // iPhone 15 Pro Max: Color [Natural, Blue, Black, White], Storage [256, 512, 1TB]
        ['iphone-15-pro-max',         [0, 0],   34990000, 50,     'iphone_15_pro_natural_titanium.png',   ['iphone_15_pro_natural_titanium.png']],
        ['iphone-15-pro-max',         [1, 1],   37990000, 45,     'iphone_15_pro_blue_titanium.png',      ['iphone_15_pro_blue_titanium.png']],
        ['iphone-15-pro-max',         [2, 2],   43990000, 30,     'iphone_15_pro_black_titanium.png',     ['iphone_15_pro_black_titanium.png']],
        ['iphone-15-pro-max',         [3, 0],   34990000, 40,     'iphone_15_pro_white_titanium.png',     ['iphone_15_pro_white_titanium.png']],

        // Samsung Galaxy S24 Ultra: Color [Grey, Black, Violet, Yellow], Storage [256, 512, 1TB]
        ['samsung-galaxy-s24-ultra',  [0, 0],   31990000, 50,     'samsung_s24_ultra_titanium_grey.png',  ['samsung_s24_ultra_titanium_grey.png']],
        ['samsung-galaxy-s24-ultra',  [1, 1],   34990000, 45,     'samsung_s24_ultra_titanium_black.png', ['samsung_s24_ultra_titanium_black.png']],
        ['samsung-galaxy-s24-ultra',  [2, 2],   40990000, 30,     'samsung_s24_ultra_titanium_violet.png',['samsung_s24_ultra_titanium_violet.png']],
        ['samsung-galaxy-s24-ultra',  [3, 0],   31990000, 40,     'samsung_s24_ultra_titanium_yellow.png',['samsung_s24_ultra_titanium_yellow.png']],

        // iPad Pro 13 M4: Color [Silver, Space Black], Connectivity [Wi-Fi, Cellular], Storage [256, 512, 1TB, 2TB]
        ['ipad-pro-13-m4',            [0, 0, 0], 33990000, 50,    'ipad_pro_silver.png',                  ['ipad_pro_silver.png']],
        ['ipad-pro-13-m4',            [1, 1, 1], 40990000, 35,    'ipad_pro_space_black.png',             ['ipad_pro_space_black.png']],

        // Sony WH-1000XM5: Color [Black, Silver, Midnight Blue]
        ['sony-wh-1000xm5',           [0],      8490000,  50,     'sony_wh1000xm5_black.png',             ['sony_wh1000xm5_black.png']],
        ['sony-wh-1000xm5',           [1],      8490000,  45,     'sony_wh1000xm5_silver.png',            ['sony_wh1000xm5_silver.png']],
        ['sony-wh-1000xm5',           [2],      8490000,  40,     'sony_wh1000xm5_midnight_blue.png',     ['sony_wh1000xm5_midnight_blue.png']]
    ];

    constructor() {
        super();
        seederDataManager.register('skus', this);
    }
}

export const skuDataInstance = new SKUData();
