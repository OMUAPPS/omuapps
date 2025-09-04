export type PaidJson = {
    amount: number;
    currency: string;
};

export class Paid {
    constructor(
        public amount: number,
        public currency: string,
    ) { }

    static fromJson(options: PaidJson): Paid {
        return new Paid(options.amount, options.currency);
    }

    toJson(): PaidJson {
        return {
            amount: this.amount,
            currency: this.currency,
        };
    }
}
