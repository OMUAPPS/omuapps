import type { Omu } from '@omujs/omu';

export type GameSide = 'client' | 'overlay' | 'background';

export class OmucafeApp {
    private static INSTANCE: OmucafeApp;

    constructor(
        public readonly omu: Omu,
        public readonly side: GameSide,
    ) {
        OmucafeApp.INSTANCE = this;
    }

    public static getInstance() {
        return OmucafeApp.INSTANCE;
    }
}
