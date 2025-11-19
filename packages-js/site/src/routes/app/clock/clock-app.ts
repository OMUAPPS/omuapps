import { makeRegistryWritable } from '$lib/helper.js';
import { type Omu } from '@omujs/omu';
import { RegistryType } from '@omujs/omu/api/registry';
import type { Writable } from 'svelte/store';
import { APP_ID } from './app.js';
import { DEFAULT_EVENT_CALENDAR, type Day, type EventCalendar } from './event.js';

export type Config = {
    version: number;
};

const CONFIG_REGISTRY_TYPE = RegistryType.createJson<Config>(APP_ID, {
    name: 'config',
    defaultValue: {
        version: 0,
    },
});

export class ClockApp {
    public readonly config: Writable<Config>;
    public calendar: EventCalendar;

    constructor(public readonly omu: Omu) {
        this.config = makeRegistryWritable(omu.registries.get(CONFIG_REGISTRY_TYPE));
        this.calendar = DEFAULT_EVENT_CALENDAR;
    }

    public async fetchCalendar(): Promise<EventCalendar> {
        const url = 'https://github.com/OMUAPPS/assets/raw/refs/heads/main/data/events/jp.json';
        const proxyUrl = this.omu.assets.proxy(url);
        const response = await fetch(proxyUrl);
        const json: EventCalendar = await response.json();
        this.calendar = json;
        return json;
    }

    public getTodayEvents(now: Date): Day | null {
        if (!this.calendar) {
            throw new Error('Event calendar not loaded');
        }
        const monthIndex = now.getMonth();
        const date = now.getDate();
        const month = this.calendar.months[monthIndex];
        if (!month) {
            return null;
        }
        const day = month.days[date - 1];
        if (!day) {
            return null;
        }
        return day;
    }
}
