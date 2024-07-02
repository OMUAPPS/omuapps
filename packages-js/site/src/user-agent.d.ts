type Brand = {
    readonly brand: string;
    readonly version: string;
};

type NavigatorUAData = {
    readonly brands: Brand[];
    readonly mobile: boolean;
    readonly platform: 'Windows' | string;
};

interface Navigator {
    userAgentData: NavigatorUAData;
}
