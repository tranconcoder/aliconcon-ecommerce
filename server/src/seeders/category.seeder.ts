import mongoose from 'mongoose';

const baseId = '0000000000000000000000';

type CategoryTuple = [string, string, string, string | null];

const categoryData: CategoryTuple[] = [
    // [id_suffix, name, description, parent_suffix]
    ['00', 'Điện tử', 'Mô tả điện tử', null],
    ['01', 'Điện thoại', 'Mô tả điện thoại', '00'],
    ['02', 'Laptop', 'Mô tả laptop', '00'],
    ['03', 'Phụ kiện', 'Mô tả phụ kiện', '00'],
    ['04', 'Máy tính bảng', 'Mô tả máy tính bảng', '00'],
    ['05', 'Sạc', 'Mô tả sạc', '03'],
    ['06', 'Cáp', 'Mô tả caps', '03'],
    ['07', 'Tai nghe', 'Mô tả tai nghe', '03'],
    ['08', 'Bàn phím', 'Mô tả bàn phím', '03'],
    ['09', 'Đồ gia dụng', 'Mô tả đồ gia dụng', null],
    ['0a', 'Tivi', 'Mô tả tivi', '09'],
    ['0b', 'Tủ lạnh', 'Mô tả tủ lạnh', '09'],
    ['0c', 'Máy lạnh', 'Mô tả máy lạnh', '09'],
    ['0d', 'Đồ nội thất', 'Mô tả đồ nội thất', null],
    ['0e', 'Ghế', 'Mô tả ghế', '0d'],
    ['0f', 'Bàn', 'Mô tả bàn', '0d'],
    ['10', 'Sofa', 'Mô tả sofa', '0d']
];

export const categories: Array<model.category.Category> = categoryData.map(([idSuffix, name, description, parentSuffix]) => {
    const id = new mongoose.Types.ObjectId(baseId + idSuffix);
    const category: any = {
        _id: id,
        category_name: name,
        category_icon: id,
        category_description: description
    };

    if (parentSuffix) {
        category.category_parent = new mongoose.Types.ObjectId(baseId + parentSuffix);
    }

    return category;
});
