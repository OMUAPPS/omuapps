export type GiftJson = {
    id: string;
    name?: string;
    amount?: number;
    is_paid?: boolean;
    image_url?: string;
};

export class Gift {
    id: string;
    name?: string;
    amount?: number;
    isPaid?: boolean;
    imageUrl?: string;

    constructor(options: {
        id: string;
        name?: string;
        amount?: number;
        isPaid?: boolean;
        imageUrl?: string;
    }) {
        this.id = options.id;
        this.name = options.name;
        this.amount = options.amount;
        this.isPaid = options.isPaid;
        this.imageUrl = options.imageUrl;
    }

    static fromJson(options: GiftJson): Gift {
        return new Gift({
            id: options.id,
            name: options.name,
            amount: options.amount,
            isPaid: options.is_paid,
            imageUrl: options.image_url,
        });
    }

    toJson(): GiftJson {
        return {
            id: this.id,
            name: this.name,
            amount: this.amount,
            is_paid: this.isPaid,
            image_url: this.imageUrl,
        };
    }
}
