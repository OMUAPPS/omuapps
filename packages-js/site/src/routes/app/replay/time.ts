import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export const time = writable(Date.now());

if (browser) {
    requestAnimationFrame(function updateTime() {
        time.set(Date.now());
        requestAnimationFrame(updateTime);
    });
}

export interface TimeUnit {
    factor: number;
};

const TIME_UNITS: TimeUnit[] = [
    {
        factor: 60 * 60,
    },
    {
        factor: 60,
    },
    {
        factor: 1,
    },
] as const;

export function getTimeUnits(time: number) {
    return TIME_UNITS.filter((unit) => time > unit.factor);
}

export function formatTime(time: number, units?: TimeUnit[]) {
    units = units ?? getTimeUnits(time);
    const components: string[] = [];
    for (let index = 0; index < units.length; index++) {
        const last = index === 0;
        const unit = units[index];
        components.push(
            Math.floor((time / unit.factor) % 60)
                .toString()
                .padStart(last ? 0 : 2, '0'),
        );
    }
    return components.join(':');
}
