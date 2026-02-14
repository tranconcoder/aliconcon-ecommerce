import { SeederDataRow, seederDataManager } from './index.js';

export interface IWarehouseData {
    _id: string;
    name: string;
    phoneNumber: string;
    shop: string;
    stock: number;
    provinceName: string;
    districtName: string;
    wardName: string;
    address: string;
}

class WarehouseData extends SeederDataRow<IWarehouseData> {
    protected titles: (keyof IWarehouseData)[] = [
        '_id',
        'name',
        'phoneNumber',
        'shop',
        'stock',
        'provinceName',
        'districtName',
        'wardName',
        'address'
    ];

    protected rawData = [
        // _id                      | name                  | phone        | shop                       | stock | province              | district | ward            | address
        ['000000000000000000000001', 'HCM Central Warehouse', '0987654321', '000000000000000000000001', 500,  'Thành phố Hồ Chí Minh', 'Quận 1',  'Phường Bến Nghé', '123 Đường Lê Lợi']
    ];

    constructor() {
        super();
        seederDataManager.register('warehouses', this);
    }
}

export const warehouseDataInstance = new WarehouseData();
