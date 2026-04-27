import type { AttrParticle } from './attributes';
import type { AttrContainer } from './attributes/container';
import type { AttrDragging } from './attributes/dragging';
import { type AttrImage } from './attributes/image';
import type { AttrLayered } from './attributes/layered';

export type Attributes = Partial<{
    image: AttrImage;
    dragging: AttrDragging;
    container: AttrContainer;
    particle: AttrParticle;
    layered: AttrLayered;
}>;

export type AttributeKey = keyof Attributes;
