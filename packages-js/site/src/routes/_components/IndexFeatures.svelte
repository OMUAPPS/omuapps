<script lang="ts">
    import { Tooltip } from '@omujs/ui';
    import { BROWSER } from 'esm-env';

    let scroll = 0;

    function onScroll() {
        scroll = window.scrollY;
    }

    function isVisible(element: HTMLElement | undefined, _: number) {
        if (!BROWSER) return true;
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return rect.top + 100 < window.innerHeight;
    }

    let card0, card1, card2;
</script>

<svelte:window on:scroll={onScroll} />

<div class="features">
    <a class="card" href="/docs/guide" bind:this={card0} class:visible={isVisible(card0, scroll)}>
        <Tooltip>
            アプリを入れるには
        </Tooltip>
        <i class="ti ti-click"></i>
        <div class="info">
            <h3>かんたんに導入</h3>
            <p>アプリのインストールは管理画面内で完結します。</p>
        </div>
        <i class="ti ti-chevron-right"></i>
    </a>
    <a class="card" href="/docs/guide/security" bind:this={card1} class:visible={isVisible(card1, scroll)}>
        <Tooltip>
            OMUAPPSが取り組んでいるセキュリティについて
        </Tooltip>
        <i class="ti ti-lock"></i>
        <div class="info">
            <h3>安全な権限管理</h3>
            <p>アプリは権限がなければPC内の情報にアクセスできません。</p>
        </div>
        <i class="ti ti-chevron-right"></i>
    </a>
    <div class="card" bind:this={card2} class:visible={isVisible(card2, scroll)}>
        <i class="ti ti-package"></i>
        <div class="info">
            <h3>使いやすさ</h3>
            <p>難しいことを可能な限り排除することを安全の次に考えています。</p>
        </div>
    </div>
</div>

<style lang="scss">
    .features {
        display: flex;
        flex-direction: column;
        width: min(30rem, 100%);
        gap: 3rem;
    }

    .card {
        position: relative;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        padding: 1.5rem 2rem;
        height: 8rem;
        color: var(--color-1);
        background: var(--color-bg-2);
        border: 1px solid var(--color-1);
        outline: 0.25rem solid var(--color-bg-2);
        opacity: 0.06;
        transform: translateX(-1rem);
        cursor: pointer;

        &.visible {
            animation: fadeIn 0.1621s forwards;
        }

        &:not(.visible) {
            animation: fadeOut 0.1621s forwards;
        }

        &:hover {
            background: var(--color-bg-1);
            outline: none;
            text-decoration: none;
        }

        > i {
            font-size: 2rem;
            margin-right: 2rem;
        }

        > .ti-chevron-right {
            font-size: 1.25rem;
            margin-left: auto;
            margin-right: 0rem;
        }

        > .info {
            position: relative;
            display: flex;
            flex-direction: column;

            > h3 {
                font-size: 1.5rem;
                white-space: nowrap;
            }

            > p {
                font-size: 0.75rem;
                font-weight: 600;
                color: var(--color-text);
            }

            > a {
                position: absolute;
                font-size: 0.8rem;
                bottom: -1.5rem;
            }
        }
    }

    @container (width < 400px) {
        .card {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
            padding-bottom: 2rem;

            > i {
                display: none;
            }

            > .ti-chevron-right {
                display: block;
                position: absolute;
                right: 1rem;
                bottom: 1rem;
            }
        }
    }

    @keyframes fadeIn {
        0% {
            opacity: 0.06;
            transform: translateX(-1rem);
        }
        80.1% {
            transform: translateX(0.1rem);
        }
        100% {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes fadeOut {
        0% {
            opacity: 1;
            transform: translateX(0);
        }
        100% {
            opacity: 0.06;
            transform: translateX(-1rem);
        }
    }
</style>
