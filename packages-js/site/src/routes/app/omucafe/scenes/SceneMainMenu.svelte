<script lang="ts">
    import { EXAMPLE } from '../example/example.js';
    import button_line from '../images/button_line.png';
    import title from '../images/title.svg';
    import { getGame, type SceneContext } from '../omucafe-app.js';

    export let context: SceneContext;
    $: console.log('SceneMainMenu', context);

    const { scene, gameConfig: config } = getGame();
</script>

<svelte:window on:keydown={(event) => {
    if (!context.current) return;
    if (event.key === 'Escape') {
        $scene = { type: 'cooking' };
    }
}} />
<div class="container">
    <div class="actions">
        <img src={title} alt="OMU CAFE" class="title" />
        <button on:click={() => {
            $scene = { type: 'cooking' };
        }}>
            <img src={button_line} alt="">
            <span>お店を開く</span>
            <i class="ti ti-tools-kitchen-3"></i>
            <i class="ti ti-chevron-right"></i>
        </button>
        <button on:click={() => {
            $scene = { type: 'product_list' };
        }}>
            <img src={button_line} alt="">
            <span>メニュー</span>
            <i class="ti ti-receipt"></i>
            <i class="ti ti-chevron-right"></i>
        </button>
        <button on:click={() => {
            // $config = DEFAULT_CONFIG;
            $config = EXAMPLE;
            console.log($config);
        }}>
            <img src={button_line} alt="">
            <span>設定をリセット</span>
            <i class="ti ti-settings-x"></i>
            <i class="ti ti-chevron-right"></i>
        </button>
    </div>
</div>

<style lang="scss">
    .title {
        width: 30rem;
        margin-bottom: 4rem;
        transform: translateX(-2rem);
    }
    
    .container {
        position: absolute;
        background: linear-gradient(in oklab to right,rgba(246, 242, 235, 0.95) 30%, rgba(246, 242, 235, 0) 100%);
        inset: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        padding: 0% 10%;
    }

    .actions {
        display: flex;
        flex-direction: column;
        transform: matrix(1, 0, 0.08621, 1, 0, 0);
    }

    button {
        position: relative;
        padding: 1.25rem 1rem;
        background: transparent;
        color: var(--color-text);
        border: none;
        cursor: pointer;
        font-size: 1.2rem;
        font-weight: 600;
        text-align: left;
        display: flex;
        align-items: baseline;
        width: 20rem;

        &:hover {
            animation: hover 0.1621s ease-in-out;
            animation-fill-mode: forwards;
            color: var(--color-1);

            > img {
                visibility: visible;
                animation: clip 0.0621s ease-in-out;
                animation-fill-mode: forwards;
            }

            > span {
                animation: flip 0.1621s ease-in-out;
                animation-fill-mode: forwards;
            }

            > .ti-chevron-right {
                visibility: visible;
                animation: clip 0.0621s chevron;
                animation-fill-mode: forwards;
            }
        }

        > i {
            font-size: 1.2rem;
            margin-left: 0.75rem;
        }

        > img {
            position: absolute;
            bottom: 0.75rem;
            left: 0;
            pointer-events: none;
            width: 90%;
            height: 0.5rem;
            visibility: hidden;
        }

        > .ti-chevron-right {
            margin-left: auto;
            margin-right: 1rem;
            visibility: hidden;
        }
    }

    @keyframes hover {
        0% {
            transform: translateX(0);
            color: var(--color-bg-2);
        }
        10% {
            transform: translateX(-0.1rem);
        }
        60% {
            transform: translateX(0.26rem);
        }
        100% {
            transform: translateX(0.25rem);
        }
    }

    @keyframes flip {
        0% {
            transform: scaleY(0);
        }
        20% {
            transform: scaleY(0.8);
        }
        100% {
            transform: scaleY(1);
        }
    }

    @keyframes clip {
        0% {
            clip-path: polygon(0 0, 0% 0, 100% 100%, 0 100%);
        }
        100% {
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
        }
    }

    @keyframes chevron {
        0% {
            transform: scaleY(0);
            opacity: 0;
        }
        100% {
            transform: translateX(-0.5rem);
            opacity: 1;
        }
    }
</style>
