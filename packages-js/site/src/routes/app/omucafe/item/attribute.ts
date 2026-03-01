import type { AttrContainer } from './attributes/container';
import type { AttrDragging } from './attributes/dragging';
import { type AttrImage } from './attributes/image';

export type Attributes = Partial<{
    image: AttrImage;
    dragging: AttrDragging;
    container: AttrContainer;
}>;
