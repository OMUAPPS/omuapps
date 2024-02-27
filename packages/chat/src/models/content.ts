type Primitive = {
    [key: string]: Primitive | string | number | boolean | null;
} | any[] | string | number | boolean | null;


export type ComponentJson = {
    type: string;
    data: Primitive;
};


interface Parent {
    children: Component[];
}


export abstract class Component<T extends string = string, D extends Primitive = Primitive> {
    constructor(
        public type: T,
    ) { }

    abstract toJson(): D;

    isParent(): this is Parent {
        return "children" in this;
    }

    walk(cb: (component: Component) => void): void {
        const stack: Component[] = [this];
        while (stack.length) {
            const component = stack.pop();
            if (!component) {
                continue;
            }
            cb(component);
            if (component.isParent()) {
                stack.push(...component.children);
            }
        }
    }

    *iter(): Iterable<Component> {
        const stack: Component[] = [this];
        while (stack.length) {
            const component = stack.pop();
            if (!component) {
                continue;
            }
            yield component;
            if (component.isParent()) {
                stack.push(...component.children);
            }
        }
    }

    toString(): string {
        const parts = [] as string[];
        for (const component of this.iter()) {
            if (component instanceof Text) {
                parts.push(component.text);
            }
        }
        return parts.join("");
    }
}


export type ComponentType<D, C extends Component> = {
    type: string;
    fromJson(json: D): C;
};


const componentTypes: Record<string, ComponentType<unknown, Component>> = {};

export function deserialize(json: ComponentJson): Component {
    const type = componentTypes[json.type];
    if (!type) {
        throw new Error(`Unknown component type: ${json.type}`);
    }
    return type.fromJson(json.data);
}


export function serialize(component: Component): ComponentJson {
    return {
        type: component.type,
        data: component.toJson(),
    };
}


export function register<D, C extends Component>(
    type: string,
    deserialize: (json: D) => C,
): void {
    if (componentTypes[type]) {
        throw new Error(`Component type already registered: ${type}`);
    }
    componentTypes[type] = {
        type,
        fromJson: deserialize,
    };
}


export type RootData = ComponentJson[];

export class Root extends Component<"root", RootData> implements Parent {
    constructor(public children: Component[]) {
        super("root");
    }

    toJson(): RootData {
        return this.children.map(serialize);
    }

    add(component: Component): void {
        if (!this.children) {
            this.children = [];
        }
        this.children.push(component);
    }

    text(): string {
        const parts = [] as string[];
        for (const component of this.iter()) {
            if (component instanceof Text) {
                parts.push(component.text);
            }
        }
        return parts.join("");
    }
}


export type TextData = string;

export class Text extends Component<"text", TextData> {
    constructor(public text: string) {
        super("text");
    }

    toJson(): TextData {
        return this.text;
    }

    static of(text: string): Text {
        return new Text(text);
    }
}


export type ImageData = {
    url: string;
    id: string;
    name?: string;
};

export class Image extends Component<"image", ImageData> {
    constructor(public url: string, public id: string, public name: string | undefined = undefined) {
        super("image");
    }

    toJson(): ImageData {
        return {
            url: this.url,
            id: this.id,
            name: this.name,
        };
    }

    static of({ url, id, name }: { url: string; id: string; name?: string }): Image {
        return new Image(url, id, name);
    }
}


export type LinkData = {
    url: string;
    children: ComponentJson[];
};

export class Link extends Component<"link", LinkData> implements Parent {
    constructor(public url: string, public children: Component[]) {
        super("link");
    }

    toJson(): LinkData {
        return {
            url: this.url,
            children: this.children.map(serialize),
        };
    }
}


export type SystemData = ComponentJson[];

export class System extends Component<"system", SystemData> implements Parent {
    constructor(public children: Component[]) {
        super("system");
    }

    toJson(): SystemData {
        return this.children.map(serialize);
    }
}


register("root", (json: RootData) => new Root(json.map(deserialize)));
register("text", (json: TextData) => new Text(json));
register("image", (json: ImageData) => new Image(json.url, json.id, json.name));
register("link", (json: LinkData) => new Link(json.url, json.children.map(deserialize)));
register("system", (json: SystemData) => new System(json.map(deserialize)));

