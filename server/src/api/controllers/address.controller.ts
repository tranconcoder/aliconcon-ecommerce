import { OkResponse } from '@/response/success.response.js';
import AddressService from '@/services/address.service.js';
import { RequestWithBody, RequestWithParams } from '@/types/request.js';
import { CreateAddressSchema, UpdateAddressSchema } from '@/validations/zod/address.zod.js';
import { RequestHandler } from 'express';

export default new (class AddressController {
    /* ---------------------------------------------------------- */
    /*                      Get User Addresses                   */
    /* ---------------------------------------------------------- */
    getUserAddresses: RequestHandler = async (req, res, _) => {
        new OkResponse({
            message: 'Get user addresses success!',
            metadata: await AddressService.getUserAddresses(req.userId || '')
        }).send(res);
    };

    /* ---------------------------------------------------------- */
    /*                     Get Default Address                   */
    /* ---------------------------------------------------------- */
    getDefaultAddress: RequestHandler = async (req, res, _) => {
        new OkResponse({
            message: 'Get default address success!',
            metadata: await AddressService.getDefaultAddress(req.userId || '') as any
        }).send(res);
    };

    /* ---------------------------------------------------------- */
    /*                       Create Address                      */
    /* ---------------------------------------------------------- */
    createAddress: RequestWithBody<CreateAddressSchema> = async (req, res, _) => {
        new OkResponse({
            message: 'Create address success!',
            metadata: await AddressService.createAddress(req.userId!, req.body)
        }).send(res);
    };

    /* ---------------------------------------------------------- */
    /*                       Update Address                      */
    /* ---------------------------------------------------------- */
    updateAddress: RequestWithParams<{ addressId: string }> & RequestWithBody<UpdateAddressSchema> = async (req, res, _) => {
        const { addressId } = req.params;

        new OkResponse({
            message: 'Update address success!',
            metadata: await AddressService.updateAddress(req.userId!, addressId, req.body)
        }).send(res);
    };

    /* ---------------------------------------------------------- */
    /*                      Set Default Address                  */
    /* ---------------------------------------------------------- */
    setDefaultAddress: RequestWithParams<{ addressId: string }> = async (req, res, _) => {
        const { addressId } = req.params;

        new OkResponse({
            message: 'Set default address success!',
            metadata: await AddressService.setDefaultAddress(req.userId!, addressId)
        }).send(res);
    };

    /* ---------------------------------------------------------- */
    /*                       Delete Address                      */
    /* ---------------------------------------------------------- */
    deleteAddress: RequestWithParams<{ addressId: string }> = async (req, res, _) => {
        const { addressId } = req.params;

        new OkResponse({
            message: 'Delete address success!',
            metadata: await AddressService.deleteAddress(req.userId!, addressId)
        }).send(res);
    };
})(); 