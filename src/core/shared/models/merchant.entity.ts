export const MerchantStatus = {
    Pending: 10,
    Active: 20,
    Suspended: 30,
    Deleted: 40,
};

export interface Merchant {
    id: string;
    tenantId: number;
    userId: string;
    name: string;
    tags: string[];
    status: number;

    registerno: string;
    entityType: number;
    namedba: string;
    mcc: string;
    remark: string;

    fee: number;
    ebarimtFeeEnabled: boolean;
    limitFeeEnabled: boolean;

    city: string;
    district: string;
    address: string;

    meta: {
        cityName: string;
        districtName: string;
        mccName: string;
        employeeName: string;
    };

    created_at: Date;
}