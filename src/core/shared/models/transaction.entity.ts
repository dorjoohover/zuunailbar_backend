import { PaymentDTO } from "./payment.entity";

export const PaymentType = {
    ISO8583: 10,
    SocialPay: 30,
    UPI: 40,
    AliPay: 50,
    Monpay: 60,
};

export const TransactionType = {
    Payment: 90,
    VasPayment: 300,
    SplitPayment: 400,
    BillPayment: 500,
};

export const TransactionStatus = {
    PaymentRequested: 0,
    PaymentFailed: 10,
    PaymentReversalQueued: 15,
    PaymentReversed: 20,
    PaymentVoided: 80,
    PaymentSucceedButVoided: 85,
    PaymentSucceed: 90,
    SettlementBatchUploadedWithBank: 180,
    SettlementSucceedWithBank: 190,
    SettlementSucceedWithMerchant: 290,
};

export const CvmType = {
    NoPin: 10,
    Signature: 20,
    Pin: 30,
};

export const CvmTypeLabel = {
    "10": "No pin",
    "20": "Signature",
    "30": "Pin verified",
};

export interface Transaction {
    id: string;
    merchantId: string;
    terminalId: string;
    udid: string;

    amount: number;
    feePercent: number;
    feeAmount: number;
    settlementAmount: number;

    type: number; // purpose
    payment: number; // payment method
    status: number; // payment status
    settlementno: number; // fill from terminal
    traceno: string;
    error?: string;

    referralcode?: string;

    bankMid?: string;
    bankTid?: string;
    mcc?: string;
    isExt: boolean;
    bankMidExt?: string;
    bankTidExt?: string;
    mccExt?: string;

    cardId?: string;
    cardBin?: string;
    cardBrand?: string;
    cardBank?: string;

    payments: PaymentDTO[];

    detail: {
        systemRef?: string;
        approveCode?: string;
        responseCode?: string;
        responseMessage?: string;
        transactionAt?: string;
        maskedPan?: string;
        posEntry?: string;
        emvAppId?: string;
        emvAppName?: string;
        cvm?: number;
    };

    vatReceiptId?: string;

    bankSettlementId?: string;
    bankSettlementAt?: Date;

    merchantSettlementId?: string;
    merchantSettlementAt?: Date;

    requestAt: Date;
    duration: number;
    createdAt: Date;
    updatedAt: Date;
}

export class BatchItem {
    id: string;
    amount: number;

    cardId: string;

    traceno: string;
    systemRef: string;
    approveCode: string;
    responseCode: string;
    transactionAt: string;
    posEntry: string;
}