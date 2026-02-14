import { Schema, model } from 'mongoose';
import { required, ObjectId, timestamps } from '@/configs/mongoose.config.js';

export const PAYMENT_MODEL_NAME = 'Payment';
export const PAYMENT_COLLECTION_NAME = 'payments';

export const paymentSchema = new Schema<model.payment.PaymentSchema>(
    {
        txn_ref: { type: String, required, unique: true, index: true },
        amount: { type: Number, required },
        payment_method: { type: String, required, enum: ['cod', 'vnpay', 'bank_transfer'] },
        payment_status: {
            type: String,
            required,
            enum: ['pending', 'completed', 'failed', 'cancelled'],
            default: 'pending'
        },
        payment_url: { type: String },

        // Refund fields
        refund_amount: { type: Number, default: 0 },
        refund_status: {
            type: String,
            enum: ['none', 'pending', 'completed', 'failed'],
            default: 'none'
        },
        refund_date: { type: Date },
        refund_reason: { type: String },
        refund_transaction_id: { type: String },

        // Refund history - danh sách các lần hoàn tiền
        refund_history: [{
            refund_id: { type: String, required: true },
            amount: { type: Number, required: true },
            status: {
                type: String,
                required: true,
                enum: ['pending', 'completed', 'failed']
            },
            reason: { type: String },
            transaction_id: { type: String },
            created_at: { type: Date, default: Date.now },
            completed_at: { type: Date },
            notes: { type: String }
        }],

        // VNPay specific fields
        vnpay_transaction_no: { type: String },
        vnpay_response_code: { type: String },
        vnpay_data: {
            vnp_TxnRef: { type: String },
            vnp_Amount: { type: Number },
            vnp_OrderInfo: { type: String },
            vnp_CreateDate: { type: String },
            vnp_PayDate: { type: String },
            vnp_BankCode: { type: String },
            vnp_CardType: { type: String },
            // Additional VNPay return parameters
            vnp_ResponseCode: { type: String },
            vnp_TransactionNo: { type: String },
            vnp_BankTranNo: { type: String },
            vnp_TransactionStatus: { type: String },
            return_processed_at: { type: String },
            failure_reason: { type: String }
        },

        // Timestamps
        created_at: { type: Date, default: Date.now },
        completed_at: { type: Date },

        // Additional info
        ip_address: { type: String },
        user_agent: { type: String },
        notes: { type: String }
    },
    {
        timestamps,
        collection: PAYMENT_COLLECTION_NAME
    }
);

// Create indexes
paymentSchema.index({ vnpay_transaction_no: 1 }, { sparse: true });
paymentSchema.index({ refund_status: 1 });
paymentSchema.index({ refund_transaction_id: 1 }, { sparse: true });

const paymentModel = model<model.payment.PaymentSchema>(PAYMENT_MODEL_NAME, paymentSchema);

export default paymentModel; 