import { CATEGORY_INIT_BASE_PATH } from '@/configs/media.config.js';
import { MediaMimeTypes, MediaTypes } from '@/enums/media.enum.js';
import mongoose from 'mongoose';

const baseId = '0000000000000000000000';

type MediaTuple = [string, string, string, string[], string];

const mediaData: MediaTuple[] = [
    // [id_suffix, title, fileName, children_suffixes, desc]
    ['00', 'Đồ điện tử', 'gadgets.png', ['01', '02', '03', '04'], 'Example media 1'],
    ['01', 'Điện thoại', 'iphone.png', [], 'Example media 2'],
    ['02', 'Laptop', 'laptop.png', [], 'Example media 3'],
    ['03', 'Phụ kiện', 'electronic-devices.png', ['05', '06', '07', '08'], 'Example media 4'],
    ['04', 'Máy tính bảng', 'ipad.png', [], 'Example media 5'],
    ['05', 'Sạc', 'phone-charger.png', [], 'Example media 6'],
    ['06', 'Cáp', 'cable.png', [], 'Example media 7'],
    ['07', 'Tai nghe', 'headphones.png', [], 'Example media 8'],
    ['08', 'Bàn phím', 'keyboard.png', [], 'Example media 9'],
    ['09', 'Đồ gia dụng', 'household.png', ['0a', '0b', '0c'], 'Example media 10'],
    ['0a', 'Tivi', 'television.png', [], 'Example media 11'],
    ['0b', 'Tủ lạnh', 'fridge.png', [], 'Example media 12'],
    ['0c', 'Máy lạnh', 'air-conditioner.png', [], 'Example media 13'],
    ['0d', 'Đồ nội thất', 'living-room.png', ['0e', '0f', '10'], 'Example media 14'],
    ['0e', 'Ghế', 'chair.png', [], 'Example media 15'],
    ['0f', 'Bàn', 'table.png', [], 'Example media 16'],
    ['10', 'Sofa', 'sofa.png', [], 'Example media 17']
];

export const categoryMedia: Array<model.media.MediaSchema> = mediaData.map(([idSuffix, title, fileName, childrenSuffixes, desc]) => {
    return {
        _id: new mongoose.Types.ObjectId(baseId + idSuffix),
        media_title: title,
        media_fileName: fileName,
        get media_filePath() {
            return `${CATEGORY_INIT_BASE_PATH}/${this.media_fileName}`;
        },
        media_fileType: MediaTypes.IMAGE,
        media_fileSize: 123456,
        media_mimeType: MediaMimeTypes.IMAGE_PNG,
        media_childrenList: childrenSuffixes.map(suffix => new mongoose.Types.ObjectId(baseId + suffix)),
        media_desc: desc,
        media_isFolder: false
    };
});
