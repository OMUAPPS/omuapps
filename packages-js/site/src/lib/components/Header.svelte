<script lang="ts">
    import { page } from '$app/stores';
    import title from '$lib/images/title.svg';
    import { onMount } from 'svelte';
    import Content from './Content.svelte';
    import { Tooltip } from '@omujs/ui';

    let onTop = true;

    function onScroll() {
        onTop = window.scrollY < 1;
    }

    onMount(() => {
        window.addEventListener('scroll', onScroll);

        return () => {
            window.removeEventListener('scroll', onScroll);
        };
    });
</script>

<header class:ontop={onTop}>
    <Content>
        <nav>
            <a href="/" class="title">
                <img src={title} alt="title" />
            </a>
            <ul>
                <a href="/download">
                    <li
                        aria-current={$page.url.pathname.startsWith('/download')
                            ? 'page'
                            : undefined}
                    >
                        <Tooltip>アプリを動かすための手順を見る</Tooltip>
                        <i class="ti ti-download" />
                        ダウンロード
                    </li>
                </a>
                <a href="/app">
                    <li aria-current={$page.url.pathname.startsWith('/app') ? 'page' : undefined}>
                        <Tooltip>何か使いたいアプリがあるかも</Tooltip>
                        <i class="ti ti-search" />
                        アプリを探す
                    </li>
                </a>
                <a href="/create/index">
                    <li
                        aria-current={$page.url.pathname.startsWith('/create') ? 'page' : undefined}
                    >
                        <Tooltip>あったらいいなが作れるかも</Tooltip>
                        <i class="ti ti-pencil" />
                        アプリを作る
                    </li>
                </a>
            </ul>
        </nav>
    </Content>
</header>

<style lang="scss">
    header {
        position: sticky;
        top: 0;
        right: 0;
        left: 0;
        z-index: 100;
        display: flex;
        width: 100%;
        height: fit-content;
        padding: 1rem;
        transition: background 0.06s;

        &:not(.ontop) {
            background: var(--color-bg-2);
            border-bottom: 1px solid var(--color-outline);
        }
    }

    nav {
        container-type: inline-size;
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
        color: var(--color-1);
        text-decoration: none;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 600;

        &:hover {
            background: var(--color-bg-2);
            color: var(--color-1);
            padding-bottom: 1rem;
            transition: padding 0.0621s;
        }

        &[aria-current='page'] {
            background: var(--color-bg-2);
            color: var(--color-1);
            border-bottom: 2px solid var(--color-1);
            padding-bottom: 1rem;
            font-weight: 800;
        }
    }

    .title {
        display: flex;
        align-items: center;
        height: 3em;
        height: 1.2rem;
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

    @container (min-width: 600px) {
        li {
            font-size: 0.8rem;
        }
    }

    a {
        text-decoration: none;
        height: 100%;
    }
</style>
