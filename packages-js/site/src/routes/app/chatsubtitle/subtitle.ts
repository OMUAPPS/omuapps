/* <?xml version="1.0" encoding="utf-8"?>
 <timedtext format="3">
   <head>
     <!--
       0: center to bottom-right
       1: center to bottom
       2: center to bottom-left
       3: center to right
       4: center to center
       5: center to left
       6: center to top-right
       7: center to top
       8: center to top-left
     -->
     <wp id="<wp id>" ap="<align type>" ah="<position from left 0-100>" av="position from top 0-100>" />
     <pen id="<pen id>" sz="<size 0-100?>" fc="#<foreground hex rgb color>" fo="<foreground opacity 0-255>" bc="#<background hex rgb color>" bo="<background opacity 0-255>" />
     <ws id="<ws id?>" ju="<?>" pd="<?>" sd="<?>" />
     ...style definitions
   </head>
   <body>
     <p t="<start time ms>" d="<duration ms>" p="<pen id>" wp="<wp id>" ws="<ws id>">{content}</p>
     ...contents
   </body>
</timedtext> */

export enum AlignType {
    TopLeft = 0,
    Top = 1,
    TopRight = 2,
    Left = 3,
    Center = 4,
    Right = 5,
    BottomLeft = 6,
    Bottom = 7,
    BottomRight = 8,
}

export type Position = {
    x: number;
    y: number;
    align: AlignType;
};
export enum FontType {
    Default = 0,
    Monospaced = 1,
    Proportional = 2,
}
export enum EffectType {}
export type Pen = {
    size?: number;
    font?: number;
    effect?: number;
    effectColor?: string;
    foreground?: string;
    foregroundOpacity?: number;
    background?: string;
    backgroundOpacity?: number;
};
export enum JustifyType {
    Left = 0,
    Right = 1,
    Center = 2,
}
export type Style = {
    justify: JustifyType;
    padding: number;
    shadow: number;
};
export type Subtitle = {
    positionId?: number;
    penId?: number;
    styleId?: number;
    content: string | Subtitle[];
};

class IdGenerator<T> {
    public readonly items: Map<string, [number, T]> = new Map();

    public getId(item: T): number {
        const key = JSON.stringify(item);
        const found = this.items.get(key);
        if (found) {
            return found[0];
        }
        const id = this.items.size;
        this.items.set(key, [id, item]);
        return id;
    }
}

export class SubtitleWriter {
    private readonly positionId = new IdGenerator<Position>();
    private readonly penId = new IdGenerator<Pen>();
    private readonly styleId = new IdGenerator<Style>();
    private readonly contents: Map<number, Subtitle[]> = new Map();

    constructor() {}

    public getPositionId(position: Position): number {
        return this.positionId.getId(position);
    }

    public getPenId(pen: Pen): number {
        return this.penId.getId(pen);
    }

    public getStyleId(style: Style): number {
        return this.styleId.getId(style);
    }

    public write(time: number, ...subtitles: Subtitle[]) {
        if (this.contents.has(time)) {
            throw new Error(`Subtitle already exists at time ${time}`);
        }
        this.contents.set(time, subtitles);
    }

    public toXml(): string {
        const timedText = document.createElement('timedtext');
        timedText.setAttribute('format', '3');
        const head = document.createElement('head');
        const body = document.createElement('body');
        timedText.appendChild(head);
        timedText.appendChild(body);

        for (const [, [id, position]] of this.positionId.items) {
            const wp = this.createPositionElement(id, position);
            head.appendChild(wp);
        }
        for (const [, [id, pen]] of this.penId.items) {
            const penElement = this.createPenElement(id, pen);
            head.appendChild(penElement);
        }
        for (const [, [id, style]] of this.styleId.items) {
            const ws = this.createStyleElement(id, style);
            head.appendChild(ws);
        }
        let lastTime = 0;
        let lastSubtitles: Subtitle[] | undefined;
        for (const [time, subtitles] of this.contents) {
            const duration = time - lastTime;
            if (lastSubtitles) {
                for (const subtitle of lastSubtitles) {
                    const element = this.createSubtitleElement(lastTime, duration, subtitle, false);
                    body.appendChild(element);
                }
            }
            lastSubtitles = subtitles;
            lastTime = time;
        }
        if (lastSubtitles) {
            const duration = 1000 * 60;
            for (const subtitle of lastSubtitles) {
                const element = this.createSubtitleElement(lastTime, duration, subtitle, false);
                body.appendChild(element);
            }
        }

        const serializer = new XMLSerializer();
        return `<?xml version="1.0" encoding="utf-8"?>\n${serializer.serializeToString(timedText)}`;
    }

    private createSubtitleElement(
        time: number,
        duration: number,
        subtitle: Subtitle,
        inner: boolean,
    ) {
        const element = document.createElement(inner ? 's' : 'p');
        if (!inner) {
            element.setAttribute('t', time.toString());
            element.setAttribute('d', duration.toString());
        }
        if (subtitle.penId !== undefined) {
            element.setAttribute('p', subtitle.penId.toString());
        }
        if (subtitle.positionId !== undefined) {
            element.setAttribute('wp', subtitle.positionId.toString());
        }
        if (subtitle.styleId !== undefined) {
            element.setAttribute('ws', subtitle.styleId.toString());
        }
        if (typeof subtitle.content === 'string') {
            element.textContent = subtitle.content;
        } else {
            for (const sub of subtitle.content) {
                const subElement = this.createSubtitleElement(time, duration, sub, true);
                element.appendChild(subElement);
            }
        }
        return element;
    }

    private createStyleElement(id: number, style: Style) {
        const ws = document.createElement('ws');
        ws.setAttribute('id', id.toString());
        ws.setAttribute('ju', style.justify.toString());
        ws.setAttribute('pd', style.padding.toString());
        ws.setAttribute('sd', style.shadow.toString());
        return ws;
    }

    private createPenElement(id: number, pen: Pen) {
        const penElement = document.createElement('pen');
        penElement.setAttribute('id', id.toString());
        if (pen.size !== undefined) {
            penElement.setAttribute('sz', pen.size.toString());
        }
        if (pen.foreground !== undefined) {
            penElement.setAttribute('fc', pen.foreground);
        }
        if (pen.foregroundOpacity !== undefined) {
            penElement.setAttribute('fo', (pen.foregroundOpacity * 255).toString());
        }
        if (pen.background !== undefined) {
            penElement.setAttribute('bc', pen.background);
        }
        if (pen.backgroundOpacity !== undefined) {
            penElement.setAttribute('bo', (pen.backgroundOpacity * 255).toString());
        }
        if (pen.font !== undefined) {
            penElement.setAttribute('fs', pen.font.toString());
        }
        if (pen.effect !== undefined) {
            penElement.setAttribute('et', pen.effect.toString());
        }
        if (pen.effectColor !== undefined) {
            penElement.setAttribute('ec', pen.effectColor);
        }
        return penElement;
    }

    private createPositionElement(id: number, position: Position) {
        const wp = document.createElement('wp');
        wp.setAttribute('id', id.toString());
        wp.setAttribute('ap', position.align.toString());
        wp.setAttribute('ah', position.x.toString());
        wp.setAttribute('av', position.y.toString());
        return wp;
    }
}
