import type { InputEvent } from '$lib/components/canvas/pipeline';
import type { Draw } from '$lib/components/canvas/draw';
import { expect, test, vi } from 'vitest';
import type { Game } from './game';
import { InputSystem } from './input-system';

test('wheel switches from the displayed default and disabled actions do not execute', async () => {
    const input = new InputSystem({ fridge: { hovered: false } } as Game);
    const invoke = vi.fn(async () => {});
    input.add(
        { id: 'pick', title: 'Pick up', priority: 100, invoke },
        { id: 'clone', title: 'Clone', priority: 90, invoke },
        { id: 'full', title: 'Full', priority: 80, disabled: true, invoke },
    );
    const wheel = { kind: 'mouse-wheel', delta: 1 } as InputEvent;
    const click = { kind: 'mouse-down' } as InputEvent;
    await input.handle(wheel);
    expect(input.current?.id).toBe('clone');
    await input.handle(click);
    expect(invoke).toHaveBeenCalledTimes(1);
    await input.handle(wheel);
    expect(input.current?.id).toBe('full');
    await input.handle(click);
    expect(invoke).toHaveBeenCalledTimes(1);
    await input.handle(wheel);
    expect(input.current?.id).toBe('full');
    input.clear();
    await input.handle(wheel);
    await input.handle(click);
    expect(invoke).toHaveBeenCalledTimes(1);
});

test('card stays inside the viewport at different scales and only shows relevant hints', async () => {
    const draw = {
        fontSize: 10, fontFamily: 'sans-serif', fontWeight: '600',
        measureTextActual: (text: string) => ({ width: text.length * 16 }),
        rectangle: vi.fn<Draw['rectangle']>(), textAlign: vi.fn<Draw['textAlign']>(async () => true),
    };
    const model = { push: vi.fn(), pop: vi.fn(), translate: vi.fn<(x: number, y: number, z: number) => void>(), scale: vi.fn() };
    const mouse = { x: 0, y: 0 };
    const game = {
        fridge: { hovered: false },
        renderer: { scale: 1, bounds: { min: { x: -400, y: -300 }, max: { x: 400, y: 300 } } },
        pipeline: { draw, input: { mouse: { pos: mouse } }, matrices: {
            model, getViewToWorld: () => ({ transform2: () => mouse }),
        } },
    } as unknown as Game;
    const input = new InputSystem(game);
    const action = { id: 'pick', title: 'Pick up', priority: 100, invoke: async () => {} };
    input.add(action);
    for (const scale of [1, 2]) {
        game.renderer.scale = scale;
        for (const [x, y] of [[-400, -300], [400, -300], [-400, 300], [400, 300]]) {
            Object.assign(mouse, { x, y });
            draw.rectangle.mockClear();
            await input.render();
            const [left, top] = model.translate.mock.lastCall!;
            const [, , width, height] = draw.rectangle.mock.calls[1];
            expect(left).toBeGreaterThanOrEqual(-400);
            expect(top).toBeGreaterThanOrEqual(-300);
            expect(left + width / scale).toBeLessThanOrEqual(400);
            expect(top + height / scale).toBeLessThanOrEqual(300);
        }
    }
    expect(draw.textAlign.mock.calls.at(-1)?.[1]).toBe('\u30af\u30ea\u30c3\u30af');
    input.add({ ...action, id: 'clone', title: 'Clone', priority: 90 });
    await input.render();
    expect(draw.textAlign.mock.calls.at(-1)?.[1]).toContain('\u30db\u30a4\u30fc\u30eb');
    input.clear();
    input.add({ ...action, disabled: true });
    draw.textAlign.mockClear();
    await input.render();
    expect(draw.textAlign.mock.calls.map(call => call[1])).toEqual(['\u25b6', 'Pick up']);
    expect(draw.fontSize).toBe(10);
    expect(model.push.mock.calls.length).toBe(model.pop.mock.calls.length);
});
