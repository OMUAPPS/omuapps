import { getTextureByUri } from '../../asset/asset.js';
import background from '../../asset/images/background.png';
import background2 from '../../asset/images/background2.png';
import effect from '../../asset/images/effect.png';
import kitchen_asset_overlay from '../../asset/images/kitchen_asset_overlay.png';
import { draw, glContext, matrices, side } from '../game.js';

export async function renderBackground() {
    const tex = side === 'background' ? await getTextureByUri(background2) : await getTextureByUri(background);
    // Background
    // fit to screen
    const { height } = glContext.gl.canvas;
    const scale = height / tex.height;
    draw.texture(
        0, 0,
        tex.width * scale, height,
        tex.tex,
    );
}

export async function renderEffect() {
    const gl = glContext.gl;
    // multiply
    gl.blendFunc(gl.DST_COLOR, gl.ZERO);
    const effectTex = await getTextureByUri(effect);
    // Background
    // fit to screen
    const { width, height } = glContext.gl.canvas;
    const scale = Math.max(width / effectTex.width, height / effectTex.height);
    const scaledWidth = effectTex.width * scale;
    const scaledHeight = effectTex.height * scale;
    const x = (width - scaledWidth) / 2;
    const y = (height - scaledHeight) / 2;
    draw.texture(
        x, y,
        scaledWidth, scaledHeight,
        effectTex.tex,
    );
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
}

export async function renderOverlay() {
    if (side === 'overlay') {
        const { tex, width, height } = await getTextureByUri(kitchen_asset_overlay);
        draw.texture(
            matrices.width - width, matrices.height - height,
            matrices.width, matrices.height,
            tex,
        );
    }
}

export async function renderOverlay2() {
}
