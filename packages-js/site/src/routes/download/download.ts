export function getPlatform(): string {
    if (typeof window.navigator.userAgentData === 'undefined') {
        const ua = window.navigator.userAgent;
        if (ua.indexOf('Win64') !== -1) {
            return 'windows-x86_64';
        } else if (ua.indexOf('Win32') !== -1) {
            return 'windows-x86';
        } else if (ua.indexOf('Linux') !== -1) {
            return 'linux-x86_64';
        } else if (ua.indexOf('Macintosh') !== -1) {
            return 'darwin-x86_64';
        }
    }
    const ua = window.navigator.userAgentData;
    const os = ua.platform.toLowerCase();
    return `${os}-x86_64`;
}

export function isMobile(): boolean {
    return window.navigator.userAgentData.mobile;
}

export interface VersionManifest {
    version: string;
    notes: string;
    pub_date: string;
    platforms: {
        [platform: string]: Platform;
    };
}

export interface Platform {
    signature: string;
    url: string;
}
