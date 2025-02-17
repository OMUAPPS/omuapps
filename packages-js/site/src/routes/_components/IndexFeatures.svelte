<script lang="ts">
    import { BROWSER } from 'esm-env';
    
    let scroll = 0;

    function onScroll() {
        scroll = window.scrollY;
        console.log(scroll);
    }

    function isVisible(element: HTMLElement | undefined, _scroll: number) {
        if (!BROWSER) return true;
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return rect.top + 100 < window.innerHeight;
    };

    let card0, card1, card2;
</script>

<svelte:window on:scroll={onScroll} />

<div class="card" bind:this={card0} class:visible={isVisible(card0, scroll)}>
    <i class="ti ti-click"></i>
    <div class="info">
        <h3>かんたんに導入</h3>
        <p>アプリのインストールは管理画面内で完結します。</p>
    </div>
</div>
<div class="card" bind:this={card1} class:visible={isVisible(card1, scroll)}>
    <i class="ti ti-lock"></i>
    <div class="info">
        <h3>安全な権限管理</h3>
        <p>アプリは権限がなければファイルを保存することすら出来ません。</p>
    </div>
</div>
<div class="card" bind:this={card2} class:visible={isVisible(card2, scroll)}>
    <i class="ti ti-package"></i>
    <div class="info">
        <h3>使いやすさ</h3>
        <p>アプリの管理は一つのウィンドウの中で完結します。</p>
    </div>
</div>

<style lang="scss">
    .card {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 2rem;
        padding: 1.5rem 2.5rem;
        height: 8rem;
        background: var(--color-bg-2);
        border: 1px solid var(--color-1);
        outline: 0.25rem solid var(--color-bg-2);
        opacity: 0.06;
        transform: translateX(-1rem);

        &.visible {
            animation: fadeIn 0.1621s forwards;
        }

        &:not(.visible) {
            animation: fadeOut 0.1621s forwards;
        }

        > i {
            font-size: 2rem;
            color: var(--color-1);
        }

        > .info {
            display: flex;
            flex-direction: column;

            > h3 {
                color: var(--color-1);
                font-size: 1.5rem;
                white-space: nowrap;
            }

            > p {
                font-size: 0.75rem;
                font-weight: 600;
                color: var(--color-text);
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
