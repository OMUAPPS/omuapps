import type { Omu } from '@omujs/omu';

export class OmucafeApp {
    private static INSTANCE: OmucafeApp;
    constructor(private readonly omu: Omu) {}

    public static create(omu: Omu) {
        OmucafeApp.INSTANCE = new OmucafeApp(omu);
        return this.INSTANCE;
    }
}
