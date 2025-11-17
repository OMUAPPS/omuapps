<script lang="ts">
    import { AppPage } from '@omujs/ui';
    import { APP } from './app.js';
    import App from './App.svelte';
    import { createGame } from './omucafe-app.js';

    const promise = createGame(APP, 'client');
</script>

<AppPage />
{#await promise then}
    <App />
{/await}

