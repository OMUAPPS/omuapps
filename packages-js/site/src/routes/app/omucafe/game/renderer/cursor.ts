
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
    if (ctx.mouse.ui) return;
    matrices.model.push();
    matrices.view.push();
    const position = ctx.side === 'client' ? mouse.client : matrices.unprojectPoint(ctx.mouse.position);
    const delta = ctx.side === 'client' ? mouse.delta : matrices.unprojectBasis(ctx.mouse.delta);
    let model = new Mat4(
        1, -delta.y / 100, 0, 0,
        -delta.x / 100, 1, 0, 0,
        0, 0, 1, 0,
        position.x, position.y, 0, 1,
    )
    if (ctx.side === 'overlay' && ctx.scene.type !== 'photo_mode') {
        matrices.view.translate(
            0,
            matrices.height / 2,
            0.
        )
        const z = model.m31 + 1080;
        model = new Mat4(
            model.m00 * 0.8 * 2, model.m01, model.m02, model.m03,
            model.m10, model.m11 * -0.7 * 2, model.m12, model.m13,
            model.m20, model.m21, model.m22, model.m23,
            model.m30, 5000 / z * 260 - 500 - 100, model.m32, model.m33,
        );
    }

    if (ctx.scene.type === 'photo_mode' && ctx.config.photo_mode.tool.type !== 'move') {
        return;
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
    const time = Time.now();
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
