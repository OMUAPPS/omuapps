type ReactiveAvatar = {
    inactive: string;
    speaking: string;
    deafened: string;
    muted: string;
    name: string;
};

type ReactiveUser = {
    activeModelID: string;
    dimOthers: string;
    iconOthers: string;
    iconSelf: string;
    id: string;
    includeSelf: string;
    nameSize: string;
    showNames: string;
};

export class ReactiveAPI {
    constructor(
        private readonly userId: string,
        private readonly fetch: (url: string) => Promise<Response>,
    ) {}

    private parseData(data: string): Record<string, string> {
        const result: Record<string, string> = {};
        if (data[0] === '{' && data[data.length - 1] === '}') {
            data = data.slice(1, data.length - 1);
        } else {
            return result;
        }
        while (data.length > 0) {
            const keyEnd = data.indexOf(':');
            if (keyEnd === -1) {
                break;
            }
            const valueStart = data.indexOf('"', keyEnd + 1);
            if (valueStart === -1) {
                break;
            }
            const valueEnd = data.indexOf('"', valueStart + 1);
            if (valueEnd === -1) {
                break;
            }
            const key = data.slice(0, keyEnd).trim();
            const value = data.slice(valueStart + 1, valueEnd);
            result[key] = value;
            const next = data.indexOf(',', valueEnd + 1);
            if (next !== -1) {
                data = data.slice(next + 1);
            } else {
                data = data.slice(valueEnd + 1);
            }
        }
        return result;
    }

    public async override(id: string): Promise<ReactiveAvatar> {
        const res = await this.fetch(`https://reactive.fugi.tech/trpc/override?batch=1&input={"0":"[{\\"hostID\\":1,\\"targetID\\":2,\\"modelID\\":3},\\"${this.userId}\\",\\"${id}\\",null]"}`);
        const json = await res.json();
        const data: string = json[0].result.data;
        const result = this.parseData(data);
        return result as ReactiveAvatar;
    }

    public async user(id: string): Promise<ReactiveUser> {
        const res = await this.fetch(`https://reactive.fugi.tech/trpc/user?batch=1&input={"0":"[\\"${id}\\"]"}`);
        const json = await res.json();
        const data: string = json[0].result.data;
        const result = this.parseData(data);
        return result as ReactiveUser;
    }

    public async model(id: string): Promise<ReactiveAvatar> {
        const res = await this.fetch(`https://reactive.fugi.tech/trpc/model?batch=1&input={"0":"[{\\"userID\\":1,\\"modelID\\":2},\\"${this.userId}\\",\\"${id}\\"]"}`);
        const json = await res.json();
        const data: string = json[0].result.data;
        const result = this.parseData(data);
        return result as ReactiveAvatar;
    }
}
