<script lang="ts">
    import { Button } from '@omujs/ui';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    const { scene } = getGame();
    $: console.log('ScenePhotoMode', context);
</script>

<div class="screen">
    <div class="photo">
    </div>
    <div class="exit">
        <Button onclick={() => {
            $scene = {
                type: 'cooking',
            };
        }} primary>
            終わる
            <i class="ti ti-x"></i>
        </Button>
    </div>
</div>

<style lang="scss">
    .exit {
        position: absolute;
        bottom: 0;
        right: 0;
        margin: 4rem;
        scale: 1.25;
    }
</style>
