export const PaymentStatus = {
    Refunded: 10,
    Succeed: 20,
    BankSettled: 30,
    PaymentSettled: 40,
};

export class PaymentDTO {
    amount: number;
    remark: string;
    receiverId: string;
}

export class Payment {
    id: string;
    status: number;
    merchantId: string;
    terminalId: string;
    transactionId: string;
    reference: string;
    remark: string;

    payment: number;
    amount: number;
    settlementAmount: number;
    receiverId: string;
    receiverName: string;
    settlementno: number;

    created_at: Date;
    updatedAt: Date;

    bankSettlementId: string;
    bankSettlementAt: Date;

    settlementId: string;
    settlementAt: Date;
}