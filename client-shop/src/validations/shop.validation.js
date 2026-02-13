import * as Yup from 'yup';
 
export const registerShopSchema = Yup.object().shape({
    // Shop Information
    shop_name: Yup.string()
        .required('Shop name is required')
        .min(3, 'Shop name must be at least 3 characters')
        .max(100, 'Shop name must not exceed 100 characters'),

    shop_email: Yup.string()
        .required('Shop email is required')
        .email('Please enter a valid email address'),

    shop_phoneNumber: Yup.string()
        .required('Shop phone number is required')
        .matches(/^[0-9+\-\s()]{8,15}$/, 'Please enter a valid phone number'),

    shop_type: Yup.string().required('Shop type is required'),

    shop_certificate: Yup.string()
        .required('Business certificate number is required')
        .min(3, 'Certificate number must be at least 3 characters'),

    shop_description: Yup.string().max(1000, 'Description must not exceed 1000 characters'),

    // Owner Information
    shop_owner_fullName: Yup.string()
        .required('Owner full name is required')
        .min(3, 'Full name must be at least 3 characters')
        .max(100, 'Full name must not exceed 100 characters'),

    shop_owner_email: Yup.string()
        .required('Owner email is required')
        .email('Please enter a valid email address'),

    shop_owner_phoneNumber: Yup.string()
        .required('Owner phone number is required')
        .matches(/^[0-9+\-\s()]{8,15}$/, 'Please enter a valid phone number'),

    shop_owner_cardID: Yup.string()
        .required('Owner ID card number is required')
        .min(5, 'ID card number must be at least 5 characters')
});
