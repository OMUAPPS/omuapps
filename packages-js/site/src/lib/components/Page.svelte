<script lang="ts">
    import background from '$lib/images/background.png';
    import Content from './Content.svelte';
    import Footer from './Footer.svelte';
    import Header from './Header.svelte';

    export let noBackground = false;
    export let header: boolean | 'always' = true;
    export let footer: boolean = true;
</script>

{#if header}
    <Header always={header === 'always'} />
{/if}
<slot name="banner">
    <img src={background} alt="background" class="background" />
</slot>
<header>
    <Content>
        <div class="header-content">
            {@render header?.()}
        </div>
    </Content>
</header>
<main class:no-background={noBackground}>
    <Content>
        <div class="main-content">
            {@render content?.()}
        </div>
        {#if footer}
            <Footer />
        {/if}
    </Content>
</main>

<style lang="scss">
    $haeder-height: min(42vh, calc(100vw));

    .background {
        position: fixed;
        inset: 0;
        z-index: -1;
        opacity: 0.5;
        filter: blur(.0621rem) contrast(0.621) brightness(1.23621);
    }

    header {
        position: absolute;
        top: 0;
        display: flex;
        height: $haeder-height;
        width: 100%;
        font-weight: 600;

        .header-content {
            display: flex;
            flex-direction: column;
            justify-content: center;
            height: 100%;
            width: 100%;
            padding: 4rem 0;
            padding-top: 10rem;
        }
    }

    main {
        position: absolute;
        top: $haeder-height;
        width: 100%;
        min-height: calc(100% - #{$haeder-height});
        height: fit-content;
        background: var(--color-bg-2);

        .main-content {
            margin-top: 4rem;
        }

        &.no-background {
            background: none;
        }
    }
</style>
