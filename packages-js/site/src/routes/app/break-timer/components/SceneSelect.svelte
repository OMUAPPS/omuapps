<script lang="ts">
    import type { OBSPlugin } from '@omujs/obs';
    import type { SceneJson } from '@omujs/obs/types.js';
    import { Combobox } from '@omujs/ui';

    export let obs: OBSPlugin;
    export let scene: string | null = null;

    let scenes: SceneJson[] = [];

    async function updateScenes() {
        scenes = (await obs.sceneList()).scenes;
    }

    updateScenes();
</script>

<Combobox
    options={Object.fromEntries(
        scenes.map((scene) => [scene.name, { label: scene.name, value: scene.name }]),
    )}
    bind:value={scene}
    on:open={updateScenes}
/>
