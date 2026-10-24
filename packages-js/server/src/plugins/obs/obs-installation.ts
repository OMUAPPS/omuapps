import { homedir } from 'node:os';
import path from 'node:path';

export interface ObsInstallation {
    readonly configDirectory: string;
    readonly pluginDirectory: string;
    readonly processNames: readonly string[];
}

class WindowsObsInstallation implements ObsInstallation {
    public get configDirectory(): string {
        return path.join(process.env.APPDATA ?? path.join(homedir(), 'AppData', 'Roaming'), 'obs-studio');
    }

    public get pluginDirectory(): string {
        return path.join(process.env.PROGRAMDATA ?? 'C:\\ProgramData', 'obs-studio', 'plugins', 'omuapps');
    }

    public readonly processNames: readonly string[] = ['obs64.exe', 'obs32.exe'];
}

class MacObsInstallation implements ObsInstallation {
    public get configDirectory(): string {
        return path.join(homedir(), 'Library', 'Application Support', 'obs-studio');
    }

    public get pluginDirectory(): string {
        return path.join(this.configDirectory, 'plugins', 'omuapps.plugin');
    }

    public readonly processNames: readonly string[] = ['obs', 'OBS'];
}

class LinuxObsInstallation implements ObsInstallation {
    public get configDirectory(): string {
        return path.join(process.env.XDG_CONFIG_HOME ?? path.join(homedir(), '.config'), 'obs-studio');
    }

    public get pluginDirectory(): string {
        return path.join(this.configDirectory, 'plugins', 'omuapps');
    }

    public readonly processNames: readonly string[] = ['obs'];
}

export class ObsInstallations {
    public static readonly current: ObsInstallation = ObsInstallations.detect();

    private static detect(): ObsInstallation {
        if (process.platform === 'win32') return new WindowsObsInstallation();
        if (process.platform === 'darwin') return new MacObsInstallation();
        return new LinuxObsInstallation();
    }
}
