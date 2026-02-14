import { SeederDataRow, seederDataManager } from './index.js';

export interface ISPUData {
    name: string;
    desc: string;
    categorySuffix: string;
    price: number;
    image: string;
    slug: string;
    attrs: { attr_name: string; attr_value: string }[];
    variations: { name: string; values: string[]; images: string[] }[];
}

class SPUData extends SeederDataRow<ISPUData> {
    protected titles: (keyof ISPUData)[] = [
        'name',
        'desc',
        'categorySuffix',
        'price',
        'image',
        'slug',
        'attrs',
        'variations'
    ];

    protected rawData = [
        // name                       | desc                                      | cat | price    | image               | slug                       | attrs                                             | variations
        ['iPhone 15 Pro Max',         'The ultimate iPhone with titanium design.', '01', 34990000, 'iphone-15-pro.png',   'iphone-15-pro-max',         [['Brand', 'Apple'],   ['Material', 'Titanium']],       [['Color', ['Natural Titanium', 'Blue Titanium', 'Black Titanium', 'White Titanium'], ['iphone_15_pro_natural_titanium.png', 'iphone_15_pro_blue_titanium.png', 'iphone_15_pro_black_titanium.png', 'iphone_15_pro_white_titanium.png']], ['Storage', ['256GB', '512GB', '1TB'], []]]],
        ['Samsung Galaxy S24 Ultra',  'Galaxy AI is here.',                       '01', 31990000, 'samsung-s24.png',     'samsung-galaxy-s24-ultra',  [['Brand', 'Samsung'], ['Pen', 'S-Pen Included']],      [['Color', ['Titanium Grey', 'Titanium Black', 'Titanium Violet', 'Titanium Yellow'], ['samsung_s24_ultra_titanium_grey.png', 'samsung_s24_ultra_titanium_black.png', 'samsung_s24_ultra_titanium_violet.png', 'samsung_s24_ultra_titanium_yellow.png']], ['Storage', ['256GB', '512GB', '1TB'], []]]],
        ['MacBook Pro 16 M3',         'Mind-blowing. Head-turning.',              '02', 62990000, 'macbook-pro.png',     'macbook-pro-16-m3',         [['Brand', 'Apple'],   ['Screen', 'Liquid Retina XDR']], [['Chip', ['M3 Pro', 'M3 Max'], []], ['RAM', ['18GB', '36GB', '48GB', '64GB', '96GB', '128GB'], []]]],
        ['iPad Pro 13 M4',            'Thinpossible.',                            '04', 33990000, 'ipad-pro.png',        'ipad-pro-13-m4',            [['Brand', 'Apple'],   ['Screen', 'Ultra Retina XDR']], [['Color', ['Silver', 'Space Black'], ['ipad_pro_silver.png', 'ipad_pro_space_black.png']], ['Connectivity', ['Wi-Fi', 'Wi-Fi + Cellular'], []], ['Storage', ['256GB', '512GB', '1TB', '2TB'], []]]],
        ['Sony WH-1000XM5',           'Your world. Nothing else.',                '00', 8490000,  'sony-headphones.png', 'sony-wh-1000xm5',           [['Brand', 'Sony'],    ['Type', 'Over-ear']],           [['Color', ['Black', 'Silver', 'Midnight Blue'], ['sony_wh1000xm5_black.png', 'sony_wh1000xm5_silver.png', 'sony_wh1000xm5_midnight_blue.png']]]]
    ];

    constructor() {
        super();
        seederDataManager.register('spus', this);
    }

    public override getData(): ISPUData[] {
        return super.getData().map((p) => ({
            ...p,
            attrs: (p.attrs as any[]).map(([attr_name, attr_value]) => ({ attr_name, attr_value })),
            variations: (p.variations as any[]).map(([name, values, images]) => ({
                name,
                values,
                images: images || []
            }))
        }));
    }
}

export const spuDataInstance = new SPUData();
