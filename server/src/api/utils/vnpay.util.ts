import crypto from 'crypto';
import { BadRequestErrorResponse } from '../response/error.response.js';

/* -------------------------------------------------------------------------- */
/*                                 VNPAY UTILS                                */
/* -------------------------------------------------------------------------- */

export class VNPayUtil {
    /* ------------------- Method Divider ------------------- */
    /**
     * @description Sorts an object's keys alphabetically and encodes values (VNPAY standard).
     * @param {any} obj - The object to sort.
     * @returns {any} A new object with sorted keys and encoded values.
     */
    public sortParams(obj: any): any {
        const sortedObj: any = Object.entries(obj)
            .filter(
                ([key, value]) => value !== "" && value !== undefined && value !== null
            )
            .sort(([key1], [key2]) => key1.toString().localeCompare(key2.toString()))
            .reduce((acc: any, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {});

        return sortedObj;
    }

    /* ------------------- Method Divider ------------------- */
    /**
     * @description Creates a HMAC-SHA512 signature for VNPay requests.
     * @param {any} params - The parameters to sign.
     * @param {string} hashSecret - The secret key used for signing.
     * @returns {string} The hex-encoded signature.
     */
    public generateVNPaySignature(params: any, hashSecret: string): string {
        // Remove secure hash fields if they exist
        const paramsToSign = { ...params };
        delete paramsToSign['vnp_SecureHash'];
        delete paramsToSign['vnp_SecureHashType'];

        // Sort parameters alphabetically using the working sortParams method
        const sortedParams = this.sortParams(paramsToSign);

        // Create query string using URLSearchParams (standard VNPAY approach)
        const urlParams = new URLSearchParams();
        for (let [key, value] of Object.entries(sortedParams)) {
            urlParams.append(key, String(value));
        }

        const queryStr = urlParams.toString();
        console.log('Data to sign:', queryStr);

        // Create HMAC-SHA512 signature
        const hmac = crypto.createHmac('sha512', hashSecret);
        const signature = hmac.update(queryStr).digest('hex');

        console.log('Generated signature:', signature);

        return signature;
    }

    /* ------------------- Method Divider ------------------- */
    /**
     * @description Formats amount to VNPay standard (rounds to nearest integer).
     * @param {number} amount - The amount to format.
     * @returns {number} The formatted amount.
     * @throws {BadRequestErrorResponse} If amount is invalid.
     */
    public formatVNPayAmount(amount: number): number {
        // VNPay requires amount in smallest currency unit (VND cents)
        // Convert to integer and ensure no decimal places
        const vnpAmount = Math.round(amount);

        // Additional validation
        if (isNaN(vnpAmount) || vnpAmount <= 0) {
            throw new BadRequestErrorResponse({ message: 'Invalid payment amount' });
        }

        return vnpAmount;
    }
}

const vnpayUtil = new VNPayUtil();
export default vnpayUtil;