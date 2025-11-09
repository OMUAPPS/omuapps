import { writable } from 'svelte/store';

export const filter = writable({
    showIndev: false,
    search: '',
});
