import { SeederDataRow, seederDataManager } from './index.js';

export interface ICategoryData {
    category_name: string;
    category_parent_suffix: string | null;
    category_icon: string;
    category_description: string;
    id_suffix: string;
}

class CategoryData extends SeederDataRow<ICategoryData> {
    protected titles: (keyof ICategoryData)[] = [
        'category_name',
        'category_parent_suffix',
        'category_icon',
        'category_description',
        'id_suffix'
    ];

    protected rawData = [
        // category_name     | parent_suffix | category_icon                | category_description                              | id_suffix
        ['Điện tử',          null,           'category-electronics.png',    'Các thiết bị và linh kiện điện tử hiện đại',       '00'],
        ['Điện thoại',       '00',           'category-phone.png',          'Smartphone, điện thoại phổ thông và phụ kiện',     '01'],
        ['Laptop',           '00',           'category-laptop.png',         'Máy tính xách tay văn phòng, gaming và đồ họa',    '02'],
        ['Phụ kiện',         '00',           'category-accessories.png',    'Tai nghe, chuột, bàn phím và các phụ kiện khác',   '03'],
        ['Máy tính bảng',    '00',           'category-tablet.png',         'Các dòng tablet từ iPad đến Android',              '04']
    ];

    constructor() {
        super();
        seederDataManager.register('categories', this);
    }
}

export const categoryDataInstance = new CategoryData();
