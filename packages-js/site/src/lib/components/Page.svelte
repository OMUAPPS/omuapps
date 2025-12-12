<script lang="ts">
    import background from '$lib/images/background.png';
    import Content from './Content.svelte';
    import Footer from './Footer.svelte';
    import Header from './Header.svelte';

    interface Props {
        noBackground?: boolean;
        headerMode?: boolean | 'always';
        footer?: boolean;
        banner?: import('svelte').Snippet;
        header?: import('svelte').Snippet;
        content?: import('svelte').Snippet;
    }

    let {
        noBackground = false,
        headerMode = true,
        footer = true,
        banner,
        header,
        content,
    }: Props = $props();
</script>

{#if headerMode}
    <Header always={headerMode === 'always'} />
{/if}
{#if banner}
    {@render banner()}
{:else}
    <img src={background} alt="background" class="background" />
{/if}
<header>
    <Content>
        {@render header?.()}
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
    $header-height: min(42vh, calc(100vw));

    .background {
        position: fixed;
        inset: 0;
        z-index: -1;
        opacity: 0.5;
        filter: blur(.0621rem) contrast(0.621) brightness(1.23621);
    }

    header {
        container-type: inline-size;
        position: absolute;
        top: 0;
        display: flex;
        height: $header-height;
        width: 100%;
        font-weight: 600;
        padding-top: 14rem;
    }

    main {
        position: absolute;
        container-type: inline-size;
        top: $header-height;
        width: 100%;
        min-height: calc(100% - #{$header-height});
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
