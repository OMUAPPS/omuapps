export interface EventCalendar {
    source: string;
    name: string;
    description: string;
    license: License;
    months: Month[];
}

export interface License {
    url: string;
    name: string;
}

export interface Month {
    month: string;
    days: Day[];
    url: string;
}

export interface Day {
    day: string;
    url: string;
    events: Event[];
}

export interface Event {
    title: string;
    description: string[];
    references?: string[];
}

export const DEFAULT_EVENT_CALENDAR: EventCalendar = {
    source: '',
    name: '',
    description: '',
    license: {
        url: '',
        name: '',
    },
    months: [],
};
