import { App, AppJson } from '../../app.js';
import { PacketType } from '../../network/packet/packet.js';
import { PermissionTypeJson } from '../permission/permission.js';
import { PackageInfo } from '../plugin/package-info.js';
import { AppIndexRegistryMeta } from '../server/extension.js';
import { DASHBOARD_EXTENSION_TYPE } from './constants.js';

export type AppInstallResponse = {
    accepted: boolean;
};

export const DASHBOARD_OPEN_APP_PACKET: PacketType<App> = PacketType.createJson<App>(DASHBOARD_EXTENSION_TYPE, {
    name: 'open_app',
    serializer: App,
});
export interface PromptRequestBase<T extends string> {
    kind: T;
    id: string;
}

export interface PromptRequestAppPermissions extends PromptRequestBase<'app/permissions'> {
    app: AppJson;
    permissions: PermissionTypeJson[];
}

export interface PromptRequestAppPlugins extends PromptRequestBase<'app/plugins'> {
    app: AppJson;
    packages: PackageInfo[];
}

export interface PromptRequestAppInstall extends PromptRequestBase<'app/install'> {
    app: AppJson;
    dependencies: Record<string, AppJson>;
}

export interface PromptRequestAppUpdate extends PromptRequestBase<'app/update'> {
    old_app: AppJson;
    new_app: AppJson;
    dependencies: Record<string, AppJson>;
}

export interface PromptRequestIndexInstall extends PromptRequestBase<'index/install'> {
    index_url: string;
    meta?: AppIndexRegistryMeta;
}

export interface PortProcess {
    port: number;
    name: string;
    exe: string;
}

export interface PromptRequestHttpPort extends PromptRequestBase<'http/port'> {
    app: AppJson;
    processes: PortProcess[];
}

export type PromptResult = 'accept' | 'deny' | 'block';

export interface PromptResponse {
    id: string;
    kind: string;
    result: PromptResult;
}

export type PromptRequest = (
    PromptRequestAppPermissions
    | PromptRequestAppPlugins
    | PromptRequestAppInstall
    | PromptRequestAppUpdate
    | PromptRequestIndexInstall
    | PromptRequestHttpPort
);

export const DASHBOARD_PROMPT_REQUEST: PacketType<PromptRequest> = PacketType.createJson<PromptRequest>(DASHBOARD_EXTENSION_TYPE, {
    name: 'prompt_request',
});
export const DASHBOARD_PROMPT_RESPONSE: PacketType<PromptResponse> = PacketType.createJson<PromptResponse>(DASHBOARD_EXTENSION_TYPE, {
    name: 'prompt_response',
});

