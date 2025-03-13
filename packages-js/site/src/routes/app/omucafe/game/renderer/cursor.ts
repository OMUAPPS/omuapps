
import { Mat4 } from '$lib/math/mat4.js';
import { Vec4 } from '$lib/math/vec4.js';
import cursor_grab from '../../images/cursor_grab.png';
import cursor_point from '../../images/cursor_point.png';
import { getTextureByUri } from '../asset.js';
import { context, draw, matrices, mouse } from '../game.js';

export async function renderCursor() {
    if (!mouse.over) return;
    matrices.model.push();
    matrices.view.push();
    matrices.model.multiply(new Mat4(
        1, -mouse.delta.y / 100, 0, 0,
        -mouse.delta.x / 100, 1, 0, 0,
        0, 0, 1, 0,
        mouse.client.x, mouse.client.y, 0, 1,
    ));
    const CURSORS = {
        grab: {
            image: await getTextureByUri(cursor_grab),
            width: 48,
            height: 48,
            x: -26,
            y: -26,
        },
        point: {
            image: await getTextureByUri(cursor_point),
            width: 48,
            height: 48,
            x: -4,
            y: -4,
        },
    }
    const cursor = context.held ? CURSORS.point : CURSORS.grab;
    const time = performance.now();
    const duration = time - (mouse.down ? mouse.downTime : mouse.upTime);
    const a = Math.sin(duration / 40) / (Math.pow(duration / 7, 1.5) / 2 + 1) * (mouse.down ? -1 : 1);
    const scale = 1 + a;
    matrices.model.scale(scale, scale, 1);
    matrices.view.translate(a * 70, a * 70, 0);

    draw.textureColor(
        cursor.x + 4,
        cursor.y + 10,
        cursor.width + cursor.x + 4,
        cursor.height + cursor.y + 10,
        cursor.image.tex,
        new Vec4(0.3, 0.2, 0.2, 0.05),
    );
    draw.textureOutline(
        cursor.x,
        cursor.y,
        cursor.width + cursor.x,
        cursor.height + cursor.y,
        cursor.image.tex,
        Vec4.ONE,
        2,
    );
    draw.texture(
        cursor.x,
        cursor.y,
        cursor.width + cursor.x,
        cursor.height + cursor.y,
        cursor.image.tex,
    );
    matrices.model.pop();
    matrices.view.pop();
}
