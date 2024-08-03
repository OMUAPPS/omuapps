<script lang="ts">
    import type { OBSSyncApp } from './obssync-app.js';

    export let obs: OBSSyncApp;
    const { config } = obs;

    async function test() {
        await obs.sourceCreate({
            type: 'browser_source',
            name: 'Test',
            data: {
                url: 'https://omuapps.com/',
                width: 1920,
                height: 1080,
            },
            blend_properties: {
                blending_method: 'SRGB_OFF',
                blending_mode: 'NORMAL',
            },
        });
    }
</script>

<main>
    <div class="left">
        <button on:click={test}>Test</button>
    </div>
    <div>
        <p>
            {JSON.stringify($config)}
            {#await obs.sceneList() then response}
                {#each response.scenes as scene}
                    <div class="scene">
                        <p>{scene.name}</p>
                    </div>
                {/each}
            {/await}
            {#await obs.sourceList() then sources}
                {#each sources as source}
                    <div class="source">
                        <p>{source.name}</p>
                    </div>
                {/each}
            {/await}
        </p>
    </div>
</main>

<style lang="scss">
    main {
        position: relative;
        display: flex;
        flex-direction: row;
        height: 100%;
    }

    .scene {
        padding: 0.5rem 1rem;
        background: var(--color-bg-2);
        outline: 1px solid var(--color-outline);
        margin-top: 0.5rem;
    }
</style>
