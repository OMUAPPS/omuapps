import { readFileSync } from 'node:fs';
import { writable } from 'svelte/store';
import { transformWithEsbuild } from 'vite';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { ReplayData } from '../replay-app';
import { formatTime, getTimeUnits } from '../time';

vi.mock('$app/environment', () => ({ browser: false }));

afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
});

async function asset() {
    vi.useFakeTimers();
    const replayData = writable<ReplayData | null>(null);
    // Execute the component's clock logic without installing a DOM emulator.
    const source = readFileSync(new URL('./AssetApp.svelte', import.meta.url), 'utf8');
    const clock = source.slice(source.indexOf('    let timeTimeout'), source.indexOf('    function mapColorKeyValue'));
    const { code } = await transformWithEsbuild(clock, 'asset-clock.ts', { loader: 'ts', target: 'es2022' });
    let cleanup = () => {};
    const getText = new Function('$state', 'replayData', 'formatTime', 'getTimeUnits', 'onMount', 'window',
        `${code}\nreturn () => formattedTime;`,
    )(
        (value: unknown) => value, replayData, formatTime, getTimeUnits,
        (mount: () => () => void) => { cleanup = mount(); },
        { setTimeout },
    ) as () => string;
    return {
        getText,
        cleanup: () => cleanup(),
        update: (offset: number, playing: boolean, duration?: number) => replayData.set({
            video: { type: 'amazonprime' }, info: { duration },
            playback: { start: Date.now(), offset, playing },
        }),
        clear: () => replayData.set(null),
    };
}

describe('Replay asset clock', () => {
    test('shows playing and paused positions, including paused seeks and missing duration', async () => {
        const p = await asset();
        p.update(0, true);
        expect(p.getText()).toBe('0');
        vi.advanceTimersByTime(1000);
        expect(p.getText()).toBe('1');
        p.update(120, false, 5692);
        expect(p.getText()).toBe('0:02:00');
        vi.advanceTimersByTime(5000);
        expect(p.getText()).toBe('0:02:00');
        p.update(180, false, 5692);
        expect(p.getText()).toBe('0:03:00');
        expect(vi.getTimerCount()).toBe(0);
    });

    test('keeps one timer across frequent updates and cleans up on clear and unmount', async () => {
        const p = await asset();
        for (let i = 0; i < 8; i++) {
            p.update(120 + i / 4, true, 5692);
            expect(vi.getTimerCount()).toBe(1);
        }
        p.update(122, false, 5692);
        expect(vi.getTimerCount()).toBe(0);
        p.update(123, true, 5692);
        p.clear();
        expect(p.getText()).toBe('...');
        expect(vi.getTimerCount()).toBe(0);
        p.update(124, true, 5692);
        p.cleanup();
        expect(vi.getTimerCount()).toBe(0);
        p.update(125, true, 5692);
        expect(p.getText()).toBe('0:02:04');
    });

    test('formats second, minute and hour boundaries without going blank or wrapping to zero', () => {
        expect([0, 1, 59, 60, 3600].map(value => formatTime(value)))
            .toEqual(['0', '1', '59', '1:00', '1:00:00']);
    });
});
