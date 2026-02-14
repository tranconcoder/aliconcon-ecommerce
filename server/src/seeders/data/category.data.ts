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
        // category_name     | parent_suffix | category_icon                | category_description                              | id_suffix
        ['Điện tử',          null,           'electronics.png',             'Các thiết bị và linh kiện điện tử hiện đại',       '00'],
        ['Gia dụng',         null,           'household.png',               'Thiết bị gia đình và đồ dùng nhà bếp',             '10'],
        ['Nội thất',         null,           'living-room.png',              'Nội thất phòng khách, phòng ngủ và trang trí',      '20'],

        // Sub-categories of Electronics (00)
        ['Điện thoại',       '00',           'phone.png',                   'Smartphone, điện thoại phổ thông và phụ kiện',     '01'],
        ['Laptop',           '00',           'laptop.png',                  'Máy tính xách tay văn phòng, gaming và đồ họa',    '02'],
        ['Máy tính bảng',    '00',           'ipad.png',                    'Các dòng tablet từ iPad đến Android',              '03'],
        ['Phụ kiện',         '00',           'gadgets.png',                 'Tai nghe, chuột, bàn phím và các phụ kiện khác',   '04'],
        ['Tivi',             '00',           'television.png',              'Android TV, Smart TV và giải trí gia đình',        '05'],
        ['Tai nghe',         '00',           'headphones.png',              'Tai nghe Bluetooth, Gaming và chống ồn',           '06'],

        // Sub-categories of Accessories (04)
        ['Cáp sạc',          '04',           'cable.png',                   'Cáp Lightning, USB-C và cáp chuyển đổi',           '0401'],
        ['Bàn phím',         '04',           'keyboard.png',                'Bàn phím cơ, bàn phím không dây và gaming',        '0402'],
        ['Củ sạc',           '04',           'phone-charger.png',           'Sạc nhanh, sạc đa cổng và sạc dự phòng',           '0403'],

        // Sub-categories of Household (10)
        ['Tủ lạnh',          '10',           'fridge.png',                  'Tủ lạnh Inverter, side-by-side hiện đại',          '11'],
        ['Máy lạnh',         '10',           'air-conditioner.png',         'Điều hòa nhiệt độ tiết kiệm điện',                 '12'],

        // Sub-categories of Furniture (20)
        ['Ghế',              '20',           'chair.png',                    'Ghế làm việc, ghế sofa và ghế trang trí',         '21'],
        ['Bàn',              '20',           'table.png',                   'Bàn làm việc, bàn ăn và bàn trà',                  '22'],
        ['Sofa',             '20',           'sofa.png',                    'Sofa nỉ, sofa da hiện đại cho phòng khách',        '23']
    ];

    constructor() {
        super();
        seederDataManager.register('categories', this);
    }
}

export const categoryDataInstance = new CategoryData();
