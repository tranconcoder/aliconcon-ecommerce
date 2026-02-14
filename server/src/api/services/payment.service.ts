import crypto from 'crypto';
import querystring from 'qs';
import { BadRequestErrorResponse, NotFoundErrorResponse } from '@/response/error.response.js';
import orderModel from '@/models/order.model.js';
import { OrderStatus } from '@/enums/order.enum.js';
import paymentModel from '@/models/payment.model.js';
import {
    ignoreLogger,
    VNPay,
    VnpLocale,
    ProductCode,
    dateFormat,
    VnpCurrCode,
    Bank,
    VerifyIpnCall,
    IpnFailChecksum,
    IpnOrderNotFound,
    IpnInvalidAmount,
    InpOrderAlreadyConfirmed,
    IpnUnknownError,
    IpnSuccess
} from 'vnpay';
import {
    VNPAY_TMN_CODE,
    VNPAY_HASH_SECRET,
    VNPAY_URL,
    VNPAY_RETURN_URL,
    VNPAY_IPN_URL,
    VNPAY_API_URL
} from '@/configs/payment.config.js';

export default new (class PaymentService {
    private static vnpay = new VNPay({
        tmnCode: VNPAY_TMN_CODE,
        secureSecret: VNPAY_HASH_SECRET,
        vnpayHost: VNPAY_URL,
        queryDrAndRefundHost: VNPAY_API_URL,

        testMode: true, // tùy chọn, ghi đè vnpayHost thành sandbox nếu là true
        hashAlgorithm: 'SHA512' as any, // tùy chọn - fix type issue

        /**
         * Bật/tắt ghi log
         * Nếu enableLog là false, loggerFn sẽ không được sử dụng trong bất kỳ phương thức nào
         */
        enableLog: true, // tùy chọn

        /**
         * Hàm `loggerFn` sẽ được gọi để ghi log khi enableLog là true
         * Mặc định, loggerFn sẽ ghi log ra console
         * Bạn có thể cung cấp một hàm khác nếu muốn ghi log vào nơi khác
         *
         * `ignoreLogger` là một hàm không làm gì cả
         */
        loggerFn: ignoreLogger, // tùy chọn

        /**
         * Tùy chỉnh các đường dẫn API của VNPay
         * Thường không cần thay đổi trừ khi:
         * - VNPay cập nhật đường dẫn của họ
         * - Có sự khác biệt giữa môi trường sandbox và production
         */
        endpoints: {
            paymentEndpoint: 'paymentv2/vpcpay.html',
            queryDrRefundEndpoint: 'merchant_webapi/api/transaction',
            getBankListEndpoint: 'qrpayauth/api/merchant/get_bank_list',
        }, // tùy chọn
    });

    private sortParams(obj: any) {
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

    private createVNPaySignature(params: any, hashSecret: string): string {
        // Remove secure hash fields if they exist
        const paramsToSign = { ...params };
        delete paramsToSign['vnp_SecureHash'];
        delete paramsToSign['vnp_SecureHashType'];

        // Sort parameters alphabetically using the working sortParams method
        const sortedParams = this.sortParams(paramsToSign);

        // Create query string using URLSearchParams (like in working code)
        const urlParams = new URLSearchParams();
        for (let [key, value] of Object.entries(sortedParams)) {
            urlParams.append(key, String(value));
        }

        const querystring = urlParams.toString();
        console.log('Data to sign:', querystring);

        // Create HMAC-SHA512 signature (exactly like working code)
        const hmac = crypto.createHmac('sha512', hashSecret);
        const signature = hmac.update(querystring).digest('hex');

        console.log('Generated signature:', signature);

        return signature;
    }


    private formatVNPayAmount(amount: number): number {
        // VNPay requires amount in smallest currency unit (VND cents)
        // Convert to integer and ensure no decimal places
        const vnpAmount = Math.round(amount);

        // Additional validation
        if (isNaN(vnpAmount) || vnpAmount <= 0) {
            throw new BadRequestErrorResponse({ message: 'Invalid payment amount' });
        }

        console.log(`Amount conversion: ${amount} VND -> ${vnpAmount} (VNPay format)`);
        return vnpAmount;
    }

    public async createVNPayPaymentUrl({
        orderId,
        amount,
        orderInfo,
        ipAddr,
        locale = 'vn',
        bankCode = ""
    }: {
        orderId: string;
        amount: number;
        orderInfo: string;
        ipAddr: string;
        locale?: string;
        bankCode?: string;
    }) {
        /* ------------------- Find the order ------------------- */
        const order = await orderModel.findById(orderId);
        if (!order) {
            throw new NotFoundErrorResponse({ message: 'Order not found!' });
        }

        /* ----------- Check if order can be paid ----------- */
        if (order.order_status !== OrderStatus.PENDING_PAYMENT) {
            throw new BadRequestErrorResponse({
                message: 'Order is not in pending payment status!'
            });
        }

        /* ------------------- Find existing payment record ------------------- */
        if (!order.payment_id) {
            throw new NotFoundErrorResponse({ message: 'Payment record not found for this order!' });
        }

        const payment = await paymentModel.findById(order.payment_id);
        if (!payment) {
            throw new NotFoundErrorResponse({ message: 'Payment record not found!' });
        }

        /* ------------------- Use payment ID as transaction reference ------------------- */
        const txnRef = payment._id.toString();

        /* ------------------- Set expiration date ------------------- */
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const paymentUrl = PaymentService.vnpay.buildPaymentUrl({
            vnp_Amount: this.formatVNPayAmount(amount),
            vnp_IpAddr: ipAddr,
            vnp_TxnRef: txnRef,
            vnp_OrderInfo: orderInfo,
            vnp_OrderType: ProductCode.Other,
            vnp_ReturnUrl: VNPAY_RETURN_URL,
            vnp_Locale: VnpLocale.VN,
            vnp_CreateDate: dateFormat(new Date()),
            vnp_ExpireDate: dateFormat(tomorrow),
            vnp_CurrCode: VnpCurrCode.VND
        });

        /* ------------------- Update payment record with URL and VNPay data ------------------- */
        payment.payment_url = paymentUrl;
        payment.vnpay_data = {
            vnp_TxnRef: txnRef,
            vnp_Amount: this.formatVNPayAmount(amount),
            vnp_OrderInfo: orderInfo,
            vnp_CreateDate: dateFormat(new Date()).toString()
        };
        await payment.save();

        return {
            paymentUrl,
            txnRef
        };
    }

    public async handleVNPayReturn(vnpParams: any) {
        let secureHash = vnpParams['vnp_SecureHash'];

        console.log('🔄 VNPay return params received:', vnpParams);
        console.log('🔍 Key parameters:', {
            vnp_TxnRef: vnpParams['vnp_TxnRef'],
            vnp_TransactionNo: vnpParams['vnp_TransactionNo'],
            vnp_ResponseCode: vnpParams['vnp_ResponseCode'],
            vnp_Amount: vnpParams['vnp_Amount'],
            vnp_BankCode: vnpParams['vnp_BankCode'],
            vnp_BankTranNo: vnpParams['vnp_BankTranNo'],
            vnp_PayDate: vnpParams['vnp_PayDate']
        });

        // Verify signature using the same method
        const expectedSignature = this.createVNPaySignature(vnpParams, VNPAY_HASH_SECRET);

        console.log('🔐 Signature verification:', {
            expected: expectedSignature,
            received: secureHash,
            match: secureHash === expectedSignature
        });

        if (secureHash === expectedSignature) {
            console.log('✅ Signature verification successful');

            const vnpTxnRef = vnpParams['vnp_TxnRef'];
            const vnpResponseCode = vnpParams['vnp_ResponseCode'];
            const vnpTransactionNo = vnpParams['vnp_TransactionNo'];
            const vnpAmount = vnpParams['vnp_Amount'];
            const vnpBankCode = vnpParams['vnp_BankCode'];
            const vnpBankTranNo = vnpParams['vnp_BankTranNo'];
            const vnpPayDate = vnpParams['vnp_PayDate'];
            const vnpOrderInfo = vnpParams['vnp_OrderInfo'];

            console.log('📋 Extracted VNPay data:', {
                txnRef: vnpTxnRef,
                responseCode: vnpResponseCode,
                transactionNo: vnpTransactionNo,
                amount: vnpAmount,
                bankCode: vnpBankCode,
                bankTranNo: vnpBankTranNo,
                payDate: vnpPayDate,
                orderInfo: vnpOrderInfo
            });

            /* ------------------- Find payment record ------------------- */
            console.log('🔍 Searching for payment with txn_ref:', vnpTxnRef);
            const payment = await paymentModel.findOne({ txn_ref: vnpTxnRef });

            if (!payment) {
                console.log('❌ Payment record not found for txn_ref:', vnpTxnRef);
                console.log('🔍 Available payments in database:');
                const allPayments = await paymentModel.find({}).select('txn_ref _id').limit(10);
                console.log(allPayments);
                throw new NotFoundErrorResponse({ message: 'Payment record not found!' });
            }

            console.log('💳 Found payment record:', {
                id: payment._id,
                txn_ref: payment.txn_ref,
                current_status: payment.payment_status,
                current_vnpay_transaction_no: payment.vnpay_transaction_no,
                payment_method: payment.payment_method
            });

            /* ------------------- Update payment status ------------------- */
            if (vnpResponseCode === '00') {
                console.log('✅ Payment successful - updating payment record with complete VNPay data');

                // Payment successful - save all VNPay return data
                payment.payment_status = 'completed';
                payment.vnpay_transaction_no = vnpTransactionNo;
                payment.vnpay_response_code = vnpResponseCode;
                payment.completed_at = new Date();

                // Save additional VNPay data
                payment.vnpay_data = {
                    ...payment.vnpay_data, // Keep existing data
                    // Add all return parameters
                    vnp_TxnRef: vnpTxnRef,
                    vnp_Amount: vnpAmount,
                    vnp_OrderInfo: vnpOrderInfo,
                    vnp_ResponseCode: vnpResponseCode,
                    vnp_TransactionNo: vnpTransactionNo,
                    vnp_BankCode: vnpBankCode,
                    vnp_BankTranNo: vnpBankTranNo,
                    vnp_PayDate: vnpPayDate,
                    vnp_TransactionStatus: vnpParams['vnp_TransactionStatus'],
                    vnp_CardType: vnpParams['vnp_CardType'],
                    return_processed_at: new Date().toISOString()
                };

                console.log('💾 Saving payment with complete data:', {
                    payment_status: payment.payment_status,
                    vnpay_transaction_no: payment.vnpay_transaction_no,
                    vnpay_response_code: payment.vnpay_response_code,
                    completed_at: payment.completed_at,
                    vnpay_data_keys: Object.keys(payment.vnpay_data)
                });

                await payment.save();

                console.log('✅ Payment saved successfully');

                // Verify the save worked
                const savedPayment = await paymentModel.findById(payment._id);
                console.log('🔍 Verification - payment after save:', {
                    id: savedPayment?._id,
                    status: savedPayment?.payment_status,
                    vnpay_transaction_no: savedPayment?.vnpay_transaction_no,
                    vnpay_response_code: savedPayment?.vnpay_response_code,
                    vnpay_data_complete: !!savedPayment?.vnpay_data?.vnp_TransactionNo
                });

                /* ------------------- Update order status ------------------- */
                console.log('📦 Updating order status for payment_id:', payment._id);
                const updatedOrder = await orderModel.findOneAndUpdate(
                    { payment_id: payment._id },
                    {
                        order_status: OrderStatus.PENDING,
                        payment_paid: true,
                        payment_date: new Date()
                    },
                    { new: true }
                );

                if (updatedOrder) {
                    console.log('✅ Order updated successfully:', {
                        orderId: updatedOrder._id,
                        order_status: updatedOrder.order_status,
                        payment_paid: updatedOrder.payment_paid
                    });
                } else {
                    console.log('⚠️ No order found for payment_id:', payment._id);
                }

                return {
                    success: true,
                    message: 'Payment successful',
                    orderId: updatedOrder?._id.toString(),
                    txnRef: vnpTxnRef,
                    amount: vnpAmount / 100,
                    transactionNo: vnpTransactionNo,
                    bankCode: vnpBankCode,
                    payDate: vnpPayDate
                };
            } else {
                console.log('❌ Payment failed with response code:', vnpResponseCode);

                // Payment failed - still save the response data for debugging
                payment.payment_status = 'failed';
                payment.vnpay_response_code = vnpResponseCode;
                payment.completed_at = new Date();

                // Save failed payment data
                payment.vnpay_data = {
                    ...payment.vnpay_data,
                    vnp_TxnRef: vnpTxnRef,
                    vnp_Amount: vnpAmount,
                    vnp_OrderInfo: vnpOrderInfo,
                    vnp_ResponseCode: vnpResponseCode,
                    vnp_TransactionNo: vnpTransactionNo,
                    vnp_BankCode: vnpBankCode,
                    vnp_BankTranNo: vnpBankTranNo,
                    vnp_PayDate: vnpPayDate,
                    return_processed_at: new Date().toISOString(),
                    failure_reason: `VNPay response code: ${vnpResponseCode}`
                };

                await payment.save();

                /* ------------------- Find order for failed payment ------------------- */
                const order = await orderModel.findOne({ payment_id: payment._id });

                return {
                    success: false,
                    message: 'Payment failed',
                    orderId: order?._id.toString(),
                    txnRef: vnpTxnRef,
                    responseCode: vnpResponseCode,
                    transactionNo: vnpTransactionNo
                };
            }
        } else {
            console.log('❌ Signature verification failed');
            console.log('🔍 Debug signature verification:');
            console.log('   - Hash secret:', VNPAY_HASH_SECRET);
            console.log('   - Params for signing:', { ...vnpParams, vnp_SecureHash: undefined });
            throw new BadRequestErrorResponse({ message: 'Invalid signature' });
        }
    }

    public async handleVNPayIPN(vnpParams: any) {
        try {
            // Xác thực IPN call sử dụng VNPay library
            const verify: VerifyIpnCall = PaymentService.vnpay.verifyIpnCall(vnpParams);

            // Kiểm tra tính toàn vẹn của dữ liệu
            if (!verify.isVerified) {
                console.log('❌ IPN verification failed - Invalid checksum');
                return IpnFailChecksum;
            }

            // Kiểm tra kết quả thanh toán
            if (!verify.isSuccess) {
                console.log('❌ IPN verification failed - Payment not successful');
                return IpnUnknownError;
            }

            console.log('✅ IPN verification successful', verify);

            // Tìm payment record trong database
            const payment = await paymentModel.findOne({ txn_ref: verify.vnp_TxnRef });

            // Nếu không tìm thấy payment record
            if (!payment) {
                console.log('❌ Payment record not found for txnRef:', verify.vnp_TxnRef);
                return IpnOrderNotFound;
            }

            // Kiểm tra số tiền thanh toán có khớp không
            if (verify.vnp_Amount !== payment.amount) {
                console.log('❌ Amount mismatch:', {
                    vnpayAmount: verify.vnp_Amount,
                    dbAmount: payment.amount
                });
                return IpnInvalidAmount;
            }

            // Kiểm tra nếu payment đã được xác nhận trước đó
            if (payment.payment_status === 'completed') {
                console.log('⚠️ Payment already confirmed for txnRef:', verify.vnp_TxnRef);
                return InpOrderAlreadyConfirmed;
            }

            // Cập nhật trạng thái payment
            payment.payment_status = 'completed';
            payment.vnpay_transaction_no = String(verify.vnp_TransactionNo || '');
            payment.vnpay_response_code = String(verify.vnp_ResponseCode || '');
            payment.completed_at = new Date();
            await payment.save();

            // Cập nhật trạng thái order - find by payment_id instead of order_id
            await orderModel.findOneAndUpdate(
                { payment_id: payment._id },
                {
                    order_status: OrderStatus.PENDING,
                    payment_paid: true,
                    payment_date: new Date()
                },
                { new: true }
            );

            console.log('✅ Payment and order updated successfully for txnRef:', verify.vnp_TxnRef);

            // Trả về thành công cho VNPay
            return IpnSuccess;

        } catch (error) {
            console.error('❌ IPN handling error:', error);
            return IpnUnknownError;
        }
    }

    public async getPaymentByTxnRef(txnRef: string) {
        const payment = await paymentModel.findOne({ txn_ref: txnRef });
        if (!payment) {
            throw new NotFoundErrorResponse({ message: 'Payment not found!' });
        }
        return payment;
    }

    public async getPaymentsByOrderId(orderId: string) {
        // Find the order first to get the payment_id
        const order = await orderModel.findById(orderId);
        if (!order || !order.payment_id) {
            return [];
        }

        // Find the payment by payment_id
        const payment = await paymentModel.findById(order.payment_id);
        return payment ? [payment] : [];
    }

    public async updatePaymentStatusById(paymentId: string) {
        console.log('🔍 Finding payment by ID:', paymentId);

        // Find payment by ID
        const payment = await paymentModel.findById(paymentId);
        if (!payment) {
            throw new NotFoundErrorResponse({ message: 'Payment not found!' });
        }

        console.log('💳 Found payment:', {
            id: payment._id,
            status: payment.payment_status,
            method: payment.payment_method,
            amount: payment.amount,
            vnpay_transaction_no: payment.vnpay_transaction_no
        });

        // Check if this is a VNPay payment
        if (payment.payment_method === 'vnpay') {
            console.log('⚠️ WARNING: Manually updating VNPay payment status without VNPay transaction number!');
            console.log('⚠️ This will cause refund issues because vnpay_transaction_no is missing');
            console.log('⚠️ VNPay payments should only be updated through handleVNPayReturn or handleVNPayIPN');
        }

        // Check if payment is already completed
        if (payment.payment_status === 'completed') {
            console.log('⚠️ Payment already completed');
            return payment;
        }

        // Update payment status to completed
        payment.payment_status = 'completed';
        payment.completed_at = new Date();

        // For VNPay payments, add a note that this was manually updated
        if (payment.payment_method === 'vnpay') {
            console.log('🚨 Adding manual update note for VNPay payment');
            // Don't set vnpay_transaction_no here since we don't have the real one from VNPay
        }

        await payment.save();

        console.log('✅ Payment status updated to completed');

        // Find and update the corresponding order
        const order = await orderModel.findOneAndUpdate(
            { payment_id: payment._id },
            {
                order_status: OrderStatus.PENDING,
                payment_paid: true,
                payment_date: new Date()
            },
            { new: true }
        );

        if (order) {
            console.log('📦 Order status updated:', {
                orderId: order._id,
                newStatus: order.order_status,
                paymentPaid: order.payment_paid
            });
        } else {
            console.log('⚠️ No order found for payment ID:', paymentId);
        }

        return payment;
    }

    // ==================== REFUND METHODS ====================

    public async createRefund({
        paymentId,
        amount,
        reason,
        notes
    }: {
        paymentId: string;
        amount: number;
        reason?: string;
        notes?: string;
    }) {
        console.log('🔄 Creating refund for payment:', paymentId);

        // Find payment
        const payment = await paymentModel.findById(paymentId);
        if (!payment) {
            throw new NotFoundErrorResponse({ message: 'Payment not found!' });
        }

        // Check if payment is completed
        if (payment.payment_status !== 'completed') {
            throw new BadRequestErrorResponse({
                message: 'Cannot refund a payment that is not completed!'
            });
        }

        // Calculate total refunded amount
        const totalRefunded = this.calculateTotalRefunded(payment);
        const remainingAmount = payment.amount - totalRefunded;

        // Check if refund amount is valid
        if (amount <= 0) {
            throw new BadRequestErrorResponse({ message: 'Refund amount must be greater than 0!' });
        }

        if (amount > remainingAmount) {
            throw new BadRequestErrorResponse({
                message: `Refund amount (${amount}) exceeds remaining amount (${remainingAmount})!`
            });
        }

        // Generate refund ID
        const refundId = `REF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create refund entry
        const refundEntry = {
            refund_id: refundId,
            amount: amount,
            status: 'pending' as const,
            reason: reason || 'Customer request',
            created_at: new Date(),
            notes: notes
        };

        // Add to refund history
        if (!payment.refund_history) {
            payment.refund_history = [];
        }
        payment.refund_history.push(refundEntry);

        // Update overall refund status and amount
        payment.refund_status = 'pending';
        payment.refund_amount = totalRefunded + amount;
        payment.refund_date = new Date();
        payment.refund_reason = reason || 'Customer request';

        await payment.save();

        console.log('✅ Refund created successfully:', {
            refundId,
            amount,
            totalRefunded: payment.refund_amount
        });

        return {
            refundId,
            payment,
            refundEntry
        };
    }

    public async updateRefundStatus({
        paymentId,
        refundId,
        status,
        transactionId,
        notes
    }: {
        paymentId: string;
        refundId: string;
        status: 'completed' | 'failed';
        transactionId?: string;
        notes?: string;
    }) {
        console.log('🔄 Updating refund status:', { paymentId, refundId, status });

        const payment = await paymentModel.findById(paymentId);
        if (!payment) {
            throw new NotFoundErrorResponse({ message: 'Payment not found!' });
        }

        // Find refund entry
        const refundEntry = payment.refund_history?.find(r => r.refund_id === refundId);
        if (!refundEntry) {
            throw new NotFoundErrorResponse({ message: 'Refund entry not found!' });
        }

        // Update refund entry
        refundEntry.status = status;
        refundEntry.completed_at = new Date();
        if (transactionId) refundEntry.transaction_id = transactionId;
        if (notes) refundEntry.notes = notes;

        // Update overall refund status
        const allRefunds = payment.refund_history || [];
        const hasFailedRefunds = allRefunds.some(r => r.status === 'failed');
        const hasPendingRefunds = allRefunds.some(r => r.status === 'pending');
        const allCompleted = allRefunds.every(r => r.status === 'completed');

        if (allCompleted && allRefunds.length > 0) {
            payment.refund_status = 'completed';
        } else if (hasFailedRefunds) {
            payment.refund_status = 'failed';
        } else if (hasPendingRefunds) {
            payment.refund_status = 'pending';
        }

        // Update transaction ID if this is the latest refund
        if (transactionId) {
            payment.refund_transaction_id = transactionId;
        }

        await payment.save();

        console.log('✅ Refund status updated successfully');

        return payment;
    }

    public async getRefundHistory(paymentId: string) {
        const payment = await paymentModel.findById(paymentId);
        if (!payment) {
            throw new NotFoundErrorResponse({ message: 'Payment not found!' });
        }

        return {
            payment_id: paymentId,
            total_amount: payment.amount,
            total_refunded: this.calculateTotalRefunded(payment),
            refund_status: payment.refund_status || 'none',
            refund_history: payment.refund_history || []
        };
    }

    public async getRefundsByStatus(status: 'pending' | 'completed' | 'failed') {
        const payments = await paymentModel.find({
            refund_status: status
        }).select('txn_ref amount refund_amount refund_status refund_history created_at');

        return payments;
    }

    private calculateTotalRefunded(payment: any): number {
        if (!payment.refund_history || payment.refund_history.length === 0) {
            return 0;
        }

        return payment.refund_history
            .filter((refund: any) => refund.status === 'completed')
            .reduce((total: number, refund: any) => total + refund.amount, 0);
    }

    public async processVNPayRefund({
        paymentId,
        refundId,
        amount
    }: {
        paymentId: string;
        refundId: string;
        amount: number;
    }) {
        console.log('🔄 Processing VNPay refund:', { paymentId, refundId, amount });

        const payment = await paymentModel.findById(paymentId);
        if (!payment) {
            throw new NotFoundErrorResponse({ message: 'Payment not found!' });
        }

        console.log('💳 Payment details for refund:', {
            id: payment._id,
            method: payment.payment_method,
            status: payment.payment_status,
            vnpay_transaction_no: payment.vnpay_transaction_no,
            vnpay_data: payment.vnpay_data,
            created_at: payment.created_at,
            completed_at: payment.completed_at,
            amount: payment.amount
        });

        if (payment.payment_method !== 'vnpay') {
            console.log('❌ Payment method is not VNPay, skipping VNPay refund API');
            throw new BadRequestErrorResponse({ message: 'Payment method is not VNPay!' });
        }

        // Check if payment was never completed (no VNPay transaction number)
        if (!payment.vnpay_transaction_no) {
            console.log('⚠️ Payment was never completed through VNPay - missing vnpay_transaction_no');
            console.log('🔍 Possible reasons:');
            console.log('   1. Payment was cancelled before VNPay processing');
            console.log('   2. VNPay did not return transaction number');
            console.log('   3. Payment was updated via updatePaymentStatusById (not VNPay flow)');
            console.log('   4. Database update failed during VNPay return/IPN');

            // For payments that were never completed through VNPay, we just mark the refund as completed
            // since no actual money was charged through VNPay
            await this.updateRefundStatus({
                paymentId,
                refundId,
                status: 'completed',
                transactionId: `NO_CHARGE_${refundId}`,
                notes: 'Refund completed - payment was never processed through VNPay (order cancelled before payment completion)'
            });

            return {
                success: true,
                vnpay_refund_transaction_id: `NO_CHARGE_${refundId}`,
                message: 'Refund completed - no charge was made through VNPay'
            };
        }

        if (!payment.vnpay_data?.vnp_CreateDate) {
            console.log('❌ Original transaction date not found in vnpay_data');
            console.log('🔍 vnpay_data content:', payment.vnpay_data);
            throw new BadRequestErrorResponse({ message: 'Original transaction date not found!' });
        }

        // Check if we're in sandbox/test mode
        // const isTestMode = VNPAY_URL.includes('sandbox') || process.env.NODE_ENV !== 'production';
        const isTestMode = false;
        console.log('🔧 Environment check:', {
            isTestMode,
            vnpayUrl: VNPAY_URL,
            nodeEnv: process.env.NODE_ENV
        });

        try {
            // Import VNPay refund functions
            const { dateFormat, getDateInGMT7, VnpTransactionType, VnpLocale } = await import('vnpay');

            // Prepare refund request data according to VNPay API documentation
            const refundRequestDate = dateFormat(getDateInGMT7(new Date()));
            const originalTransactionDate = payment.vnpay_data.vnp_CreateDate;

            // Determine if this is a full or partial refund
            const totalRefunded = this.calculateTotalRefunded(payment);
            const totalAfterRefund = totalRefunded + amount;
            const isFullRefund = totalAfterRefund >= payment.amount;
            const transactionType = isFullRefund ? VnpTransactionType.FULL_REFUND : VnpTransactionType.PARTIAL_REFUND;

            console.log('📊 Refund analysis:', {
                originalAmount: payment.amount,
                totalRefunded,
                currentRefundAmount: amount,
                totalAfterRefund,
                isFullRefund,
                transactionType,
                isTestMode
            });

            // Handle sandbox/test mode limitation
            if (isTestMode) {
                console.log('⚠️ Running in sandbox/test mode - VNPay refund API is restricted');
                console.log('📝 Simulating successful refund for development/testing purposes');

                // Generate simulated refund transaction ID
                const simulatedRefundTxnId = `SANDBOX_REF_${Date.now()}_${refundId}`;

                // Update refund status to completed with simulation note
                await this.updateRefundStatus({
                    paymentId,
                    refundId,
                    status: 'completed',
                    transactionId: simulatedRefundTxnId,
                    notes: `Simulated VNPay refund in sandbox mode. In production, this would be processed through VNPay API. Amount: ${amount} VND`
                });

                console.log('✅ Simulated VNPay refund completed successfully');

                return {
                    success: true,
                    vnpay_refund_transaction_id: simulatedRefundTxnId,
                    message: 'Refund completed (simulated in sandbox mode)',
                    sandbox_mode: true
                };
            }

            // Production mode - actual VNPay API call
            console.log('🔄 Calling VNPay refund API (production mode)...');
            console.log('🚨 IMPORTANT: This is where the actual VNPay refund API should be called!');

            const vnpayRefundRequest = {
                vnp_Amount: this.formatVNPayAmount(amount), // Convert to VNPay format
                vnp_CreateBy: 'system', // System user creating the refund
                vnp_CreateDate: refundRequestDate, // Keep as string for VNPay API
                vnp_IpAddr: '127.0.0.1', // Server IP
                vnp_OrderInfo: `Refund for order ${payment.txn_ref} - ${refundId}`,
                vnp_RequestId: refundId, // Use our refund ID as request ID
                vnp_TransactionDate: originalTransactionDate, // Keep as string for VNPay API
                vnp_TransactionType: transactionType, // Full or partial refund
                vnp_TxnRef: payment.txn_ref, // Original transaction reference
                vnp_Locale: VnpLocale.VN, // Vietnamese locale
                vnp_TransactionNo: parseInt(payment.vnpay_transaction_no) // VNPay transaction number
            };

            console.log('📋 VNPay refund request prepared:', vnpayRefundRequest);
            console.log('📋 VNPay refund parameters:', {
                amount: `${amount} VND -> ${this.formatVNPayAmount(amount)} (VNPay format)`,
                createDate: refundRequestDate,
                transactionDate: originalTransactionDate,
                transactionType: transactionType,
                refundId: refundId,
                vnpayTransactionNo: payment.vnpay_transaction_no
            });

            console.log('🚀 About to call PaymentService.vnpay.refund() - THIS IS THE KEY LINE!');

            // Call VNPay refund API - This is the key line that calls the actual VNPay refund API
            const vnpayApiResponse = await PaymentService.vnpay.refund(vnpayRefundRequest as any);

            console.log('==================> VNPay refund response:', vnpayApiResponse);

            // Check if refund was successful
            if (vnpayApiResponse.isSuccess && vnpayApiResponse.isVerified) {
                // Generate VNPay refund transaction ID
                const vnpayRefundTxnId = `VNP_REF_${Date.now()}_${refundId}`;

                // Update refund status to completed
                await this.updateRefundStatus({
                    paymentId,
                    refundId,
                    status: 'completed',
                    transactionId: vnpayRefundTxnId,
                    notes: `VNPay refund processed successfully. Response: ${vnpayApiResponse.message}`
                });

                console.log('✅ VNPay refund processed successfully');

                return {
                    success: true,
                    vnpay_refund_transaction_id: vnpayRefundTxnId,
                    vnpay_response: vnpayApiResponse,
                    message: 'VNPay refund processed successfully'
                };

            } else {
                // Refund failed
                const errorMessage = vnpayApiResponse.message || 'VNPay refund failed';

                console.error('❌ VNPay refund failed:', errorMessage);

                // Update refund status to failed
                await this.updateRefundStatus({
                    paymentId,
                    refundId,
                    status: 'failed',
                    notes: `VNPay refund failed: ${errorMessage}. Verified: ${vnpayApiResponse.isVerified}`
                });

                throw new BadRequestErrorResponse({
                    message: `VNPay refund failed: ${errorMessage}`
                });
            }

        } catch (error: any) {
            console.error('❌ VNPay refund API error:', error);
            console.error('❌ Error stack:', error.stack);
            console.error('❌ Error details:', {
                name: error.name,
                message: error.message,
                code: error.code,
                statusCode: error.statusCode
            });

            // Check if this is a sandbox restriction error
            if (error.message && error.message.includes('sandbox')) {
                console.log('🔧 Detected sandbox restriction, falling back to simulation mode');

                const fallbackRefundTxnId = `SANDBOX_FALLBACK_${Date.now()}_${refundId}`;

                await this.updateRefundStatus({
                    paymentId,
                    refundId,
                    status: 'completed',
                    transactionId: fallbackRefundTxnId,
                    notes: `Sandbox refund limitation encountered. Refund simulated for development. Error: ${error.message}`
                });

                return {
                    success: true,
                    vnpay_refund_transaction_id: fallbackRefundTxnId,
                    message: 'Refund completed (sandbox fallback)',
                    sandbox_fallback: true
                };
            }

            // Update refund status to failed
            await this.updateRefundStatus({
                paymentId,
                refundId,
                status: 'failed',
                notes: `VNPay refund API error: ${error.message || error}`
            });

            // Re-throw the error if it's already a BadRequestErrorResponse
            if (error.statusCode) {
                throw error;
            }

            throw new BadRequestErrorResponse({
                message: `VNPay refund processing failed: ${error.message || 'Unknown error'}`
            });
        }
    }

    // ==================== END REFUND METHODS ====================
})(); 