<script lang="ts">
    import { page } from '$app/state';
    import title from '$lib/images/title.svg';
    import { Tooltip } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { onMount } from 'svelte';
    import { menuOpen } from '../../routes/docs/stores';
    import Content from './Content.svelte';

    interface Props {
        always?: boolean;
    }

    let { always = false }: Props = $props();

    let path = $derived(page.url.pathname);
    let onTop = $state(BROWSER && (!page.url.pathname.startsWith('/docs') && window.scrollY < 1));

    function onScroll() {
        onTop = window.scrollY < 1;
    }

    onMount(() => {
        document.addEventListener('scroll', onScroll);

        return () => {
            document.removeEventListener('scroll', onScroll);
        };
    });
</script>

<header class:ontop={!always && onTop}>
    <Content>
        <nav>
            {#if path.startsWith('/docs')}
                <button class="menu-toggle" onclick={() => ($menuOpen = !$menuOpen)} title="menu">
                    <i class="ti ti-menu"></i>
                </button>
            {/if}
            <a href="/" class="title">
                <img src={title} alt="title" />
            </a>
            <ul>
                <a href="/download">
                    <li
                        aria-current={path.startsWith('/download')
                            ? 'page'
                            : undefined}
                    >
                        <Tooltip>アプリを動かすための手順を見る</Tooltip>
                        <i class="ti ti-download"></i>
                        ダウンロード
                    </li>
                </a>
                <a href="/docs/guide">
                    <li aria-current={path.startsWith('/docs/guide') ? 'page' : undefined}>
                        <Tooltip>アプリの導入から使い方を知る</Tooltip>
                        <i class="ti ti-book"></i>
                        導入ガイド
                    </li>
                </a>
                <a href="/docs/app">
                    <li
                        aria-current={path.startsWith('/docs/app') && !path.startsWith('/docs/guide')
                            ? 'page'
                            : undefined}
                    >
                        <Tooltip>あったらいいなが作れるかも</Tooltip>
                        <i class="ti ti-box"></i>
                        アプリ一覧
                    </li>
                </a>
            </ul>
        </nav>
    </Content>
</header>

<style lang="scss">
    header {
        container-type: inline-size;
        position: fixed;
        top: 0;
        right: 0;
        left: 0;
        z-index: 100;
        display: flex;
        width: 100%;
        height: fit-content;
        padding: 1rem 0;
        transition: background 0.0621s;

        &:not(.ontop) {
            background: var(--color-bg-2);
            border-bottom: 1px solid var(--color-outline);
        }
    }

    .menu-toggle {
        display: none;
        width: 2.5rem;
        min-width: 2.5rem;
        height: 2.5rem;
        min-height: 2.5rem;
        border: none;
        background: var(--color-bg-1);
        color: var(--color-1);
        margin-right: 1rem;
    }

    nav {
        position: sticky;
        top: 0.5rem;
        right: 0;
        left: 0;
        box-sizing: border-box;
        display: flex;
        flex: 1;
        align-items: center;
        width: 100%;
        max-width: 64rem;
        height: 3em;
        margin: 0 auto;
        color: var(--color-1);
    }

    li {
        display: flex;
        align-items: center;
        height: 100%;
        padding: 0.75rem 1rem;
        padding-bottom: 0.75rem;
        gap: 0.25rem;
        font-size: 0;
        font-weight: 800;
        text-decoration: none;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 600;
        padding-bottom: 0.5rem;

        &:hover {
            background: var(--color-bg-2);
        }

        &[aria-current='page'] {
            background: var(--color-bg-2);
            border-bottom: 2px solid var(--color-1);
            padding-bottom: 0.75rem;
            transition: padding 0.0621s;
            font-weight: 800;
        }
    }

    .title {
        display: flex;
        align-items: center;
        height: 3em;
        padding: 1rem;
        padding-left: 0;
        margin-right: 2rem;

        img {
            height: 1.1rem;
        }
    }

    ul {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 3em;
        gap: 0.5rem;
        padding: 0;
        margin: 0;
        list-style: none;
    }

    i {
        font-size: 1.1rem;
    }

    @container (width > 600px) {
        li {
            font-size: 0.8rem;
        }
    }

    @container (width < 600px) {
        li {
            width: 3rem;
        }

        .menu-toggle {
            display: block;
        }
    }

    a {
        text-decoration: none;
        height: 100%;
    }
</style>
