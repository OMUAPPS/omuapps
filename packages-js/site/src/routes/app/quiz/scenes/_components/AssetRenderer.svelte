<script lang="ts">
    import { QuizApp, type Asset } from '../../quiz-app';

    interface Props {
        asset: Asset;
    }

    let { asset }: Props = $props();

    const quizApp = QuizApp.getInstance();
</script>

{#await quizApp.downloadAsset(asset) then url}
    <img src={url} alt="" />
{/await}

<style lang="scss">
    img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
</style>
