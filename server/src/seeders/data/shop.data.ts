import { ShopStatus, ShopType } from '@/enums/shop.enum.js';
import { SeederDataRow, seederDataManager } from './index.js';

export interface IShopData {
    _id: string;
    shop_userId: string;
    shop_name: string;
    shop_logo: string;
    shop_email: string;
    shop_type: ShopType;
    shop_certificate: string;
    provinceName: string;
    districtName: string;
    wardName: string;
    address: string;
    shop_phoneNumber: string;
    shop_description: string;
    shop_owner_cardID: string;
    shop_status: ShopStatus;
    is_brand: boolean;
}

class ShopData extends SeederDataRow<IShopData> {
    protected titles: (keyof IShopData)[] = [
        '_id',
        'shop_userId',
        'shop_name',
        'shop_logo',
        'shop_email',
        'shop_type',
        'shop_certificate',
        'provinceName',
        'districtName',
        'wardName',
        'address',
        'shop_phoneNumber',
        'shop_description',
        'shop_owner_cardID',
        'shop_status',
        'is_brand'
    ];

    protected rawData = [
        // _id                      | shop_userId                | shop_name                  | shop_logo                      | shop_email           | shop_type        | shop_certificate | provinceName           | districtName | wardName         | address            | shop_phone| shop_description                       | cardID      | status            | brand
        ['000000000000000000000001', '000000000000000000000001', 'Aliconcon Official Store', 'aliconcon-official-store.png', 'shop@aliconcon.com', ShopType.COMPANY, 'CERT-123456',     'Thành phố Hồ Chí Minh', 'Quận 1',      'Phường Bến Nghé', '123 Đường Lê Lợi', '0987654321', 'Official store for Aliconcon products', '123456789', ShopStatus.ACTIVE, true]
    ];

    constructor() {
        super();
        seederDataManager.register('shops', this);
    }
}

export const shopDataInstance = new ShopData();
