
import { BetterMath } from '$lib/math.js';
import { Mat4 } from '$lib/math/mat4.js';
import { Vec4 } from '$lib/math/vec4.js';
import cursor_grab from '../../images/cursor_grab.png';
import cursor_point from '../../images/cursor_point.png';
import { getTextureByUri } from '../asset.js';
import { draw, getContext, matrices, mouse } from '../game.js';
import { Time } from '../time.js';

export async function renderCursor() {
    const ctx = getContext();
    if (ctx.side === 'client' && !mouse.over) return;
    const { mouse: { x, y } } = ctx;
    matrices.model.push();
    matrices.view.push();
    let model = ctx.side === 'client' ? new Mat4(
        1, -mouse.delta.y / 100, 0, 0,
        -mouse.delta.x / 100, 1, 0, 0,
        0, 0, 1, 0,
        mouse.client.x, mouse.client.y, 0, 1,
    ) : new Mat4(
        1, -mouse.delta.y / 100, 0, 0,
        -mouse.delta.x / 100, 1, 0, 0,
        0, 0, 1, 0,
        BetterMath.remap(
            x,
            -1,
            1,
            0,
            matrices.width,
        ),
        BetterMath.remap(
            y,
            -1,
            1,
            matrices.height,
            0,
        ),
        0, 1,
    );
    if (ctx.side === 'overlay') {
        matrices.view.translate(
            0,
            matrices.height / 2,
            0.
        )
        const z = Math.max(Math.min(model.m31 + 620, 2000), 1);
        model = new Mat4(
            model.m00 * 0.8 * 2, model.m01, model.m02, model.m03,
            model.m10, model.m11 * -0.7 * 2, model.m12, model.m13,
            model.m20, model.m21, model.m22, model.m23,
            model.m30, 4000 / z * 20 - 20, model.m32, model.m33,
        );
    }

    matrices.model.multiply(model);
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
    const cursor = getContext().held ? CURSORS.point : CURSORS.grab;
    const time = Time.get();
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
