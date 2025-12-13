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
<main class:no-background={noBackground}>
    <header>
        <Content>
            {@render header?.()}
        </Content>
    </header>
    <div class="main-content">
        <Content>
            {@render content?.()}
            {#if footer}
                <Footer />
            {/if}
        </Content>
    </div>
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
        top: 0;
        display: flex;
        min-height: $header-height;
        padding: 4rem 0;
        width: 100%;
        font-weight: 600;
        padding-top: min(14rem, $header-height - 8rem);
    }

    main {
        position: absolute;
        container-type: inline-size;
        width: 100%;
        min-height: calc(100% - #{$header-height});
        height: fit-content;

        .main-content {
            padding-top: 4rem;
            background: var(--color-bg-2);
        }

        &.no-background {
            background: none;
        }
    }
</style>
