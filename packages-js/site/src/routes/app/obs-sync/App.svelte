<script lang="ts">
    import AssetButton from '$lib/components/AssetButton.svelte';
    import { OBSPlugin } from '@omujs/obs';
    import type { SourceType } from '@omujs/obs/types.js';
    import type { Omu } from '@omujs/omu';

    export let omu: Omu;
    export let obs: OBSPlugin;
    let source: SourceType<string, unknown>;

    async function getAvailableName(name: string) {
        const sources = await obs.sourceList();
        const names = sources.map((source) => source.name);
        if (!names.includes(name)) return name;
        let i = 1;
        let newName = name;
        while (names.includes(newName)) {
            newName = `${name} (${i})`;
            i++;
        }
        return newName;
    }

    async function test1() {
        const name = await getAvailableName('omuapps');
        const res = await obs.sourceCreate({
            type: 'browser_source',
            name: name,
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
        source = res.source;
    }
    async function test2() {
        if (!source.uuid) return;
        await obs.sourceRemoveByUuid(source.uuid);
    }

    async function test3() {
        await obs.sceneSetCurrentByName('test');
    }
</script>

<main>
    <div class="left">
        <button on:click={test1}>Test1</button>
        <button on:click={test2}>Test2</button>
        <button on:click={test3}>Test3</button>
    </div>
    <div>
        <p>
            Current Scene:
            {#await obs.sceneGetCurrent() then source}
                {#if source}
                    <div class="source">
                        <p>{source.name}</p>
                        {JSON.stringify(source)}
                    </div>
                {:else}
                    <p>no current scene</p>
                {/if}
            {/await}
        </p>
        <p>
            Scene List:
            {#await obs.sceneList() then response}
                {#each response.scenes as scene}
                    <button
                        class="scene"
                        on:click={async () => await obs.sceneSetCurrentByUuid(scene.uuid)}
                    >
                        <p>{scene.name}</p>
                    </button>
                {/each}
            {/await}
            Source List:
            {#await obs.sourceList() then sources}
                {#each sources as source}
                    <div class="source">
                        <p>{source.name}</p>
                        {JSON.stringify(source)}
                    </div>
                {/each}
            {/await}
        </p>
        {JSON.stringify(source)}
        <AssetButton {omu} {obs} />
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

    .source {
        padding: 0.5rem 1rem;
        background: var(--color-bg-2);
        outline: 1px solid var(--color-outline);
        margin-top: 0.5rem;
    }
</style>
