<script lang="ts">
    import type { OBSPlugin } from '@omujs/obs';
    import type { SceneJson } from '@omujs/obs/types.js';
    import { Combobox } from '@omujs/ui';

    interface Props {
        obs: OBSPlugin;
        scene?: string | null;
    }

    let { obs, scene = $bindable(null) }: Props = $props();

    let scenes: SceneJson[] = $state([]);

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
    key={scene}
    on:open={updateScenes}
/>
