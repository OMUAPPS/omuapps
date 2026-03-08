import { Identifier } from '../../identifier';
import { Omu } from '../../omu';
import { EndpointType } from '../endpoint';
import { ExtensionType } from '../extension';
import { RegistryType } from '../registry';
import { DashboardExtension } from './extension';

export const DASHBOARD_EXTENSION_TYPE: ExtensionType<DashboardExtension> = new ExtensionType(
    'dashboard',
    (omu: Omu) => new DashboardExtension(omu),
);

type DashboardSetResponse = {
    success: boolean;
};
export const DASHBOARD_SET_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('set');
export const DASHBOARD_SET_ENDPOINT: EndpointType<Identifier, DashboardSetResponse> = EndpointType.createJson<Identifier, DashboardSetResponse>(
    DASHBOARD_EXTENSION_TYPE,
    {
        name: 'set',
        requestSerializer: Identifier,
        permissionId: DASHBOARD_SET_PERMISSION_ID,
    },
);

export type UserResponse<T = undefined> = {
    type: 'ok';
    value: T;
} | {
    type: 'blocked';
} | {
    type: 'cancelled';
};

export type UserError = Exclude<UserResponse, { type: 'ok' }>;

export type HostRequest = {
    host: string;
};

export type AllowedHost = {
    id: string;
    hosts: string[];
};

export const DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('speech_recognition');

export type TranscriptSegment = {
    confidence: number;
    transcript: string;
};

export type TranscriptStatus = {
    type: 'idle';
} | {
    type: 'result';
    timestamp: number;
    segments: TranscriptSegment[];
} | {
    type: 'final';
    timestamp: number;
    segments: TranscriptSegment[];
} | {
    type: 'audio_started';
    timestamp: number;
} | {
    type: 'audio_ended';
    timestamp: number;
};

export const DASHBOARD_SPEECH_RECOGNITION: RegistryType<TranscriptStatus> = RegistryType.createJson<TranscriptStatus>(DASHBOARD_EXTENSION_TYPE, {
    name: 'speech_recognition',
    defaultValue: { type: 'idle' },
    permissions: {
        read: DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
        write: DASHBOARD_SET_PERMISSION_ID,
    },
});

export type SpeechRecognitionStart = {
    type: 'start';
};

export const DASHBOARD_SPEECH_RECOGNITION_START: EndpointType<SpeechRecognitionStart, UserResponse<undefined>> = EndpointType.createJson<SpeechRecognitionStart, UserResponse<undefined>>(DASHBOARD_EXTENSION_TYPE, {
    name: 'speech_recognition_start',
    permissionId: DASHBOARD_SPEECH_RECOGNITION_PERMISSION_ID,
});

export const DASHBOARD_PROMPT_CLEAR_BLOCKED: EndpointType<null, null> = EndpointType.createJson<null, null>(DASHBOARD_EXTENSION_TYPE, {
    name: 'prompt_clear_blocked',
});
export const DASHBOARD_DRAG_DROP_PERMISSION_ID: Identifier = DASHBOARD_EXTENSION_TYPE.join('drag_drop');
