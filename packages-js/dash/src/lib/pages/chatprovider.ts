import { Identifier, type Omu } from '@omujs/omu';
import { EndpointType } from '@omujs/omu/api/endpoint';

const PROVIDER_IDENTIFIER = new Identifier('com.omuapps', 'chatprovider');
const START_FROM_URL = EndpointType.createJson<string, null>(PROVIDER_IDENTIFIER, {
    name: 'start_from_url',
});
const STOP_ROOM = EndpointType.createJson<string, null>(PROVIDER_IDENTIFIER, {
    name: 'stop_room',
});

export class ChatProvider {
    constructor(
        private readonly omu: Omu,
    ) {}

    public async startFromUrl(url: string) {
        await this.omu.endpoints.call(START_FROM_URL, url);
    }

    public async stopRoom(id: string) {
        await this.omu.endpoints.call(STOP_ROOM, id);
    }
}
