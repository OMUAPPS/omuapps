import type { Omu } from '@omujs/omu';

export class OmucafeApp {
    private static INSTANCE: OmucafeApp;

    constructor(public readonly omu: Omu) {}

    public static create(omu: Omu) {
        OmucafeApp.INSTANCE = new OmucafeApp(omu);
        return this.INSTANCE;
    }

    public static getInstance() {
        return OmucafeApp.INSTANCE;
    }
}
