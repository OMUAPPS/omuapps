<script lang="ts">
    import type { Writable } from 'svelte/store';
    import type { State } from '../state.js';

    export let state: Writable<State>;
</script>

{#if $state.type === 'catching'}
    {#key $state.data.thrower}
        <p>
            {$state.data.thrower}が🍟を投げた！
        </p>
    {/key}
{/if}

<style lang="scss">
    p {
        position: absolute;
        right: 24px;
        bottom: 160px;
        text-align: start;
        padding: 5px 20px;
        white-space: nowrap;
        font-family: 'RocknRoll One', sans-serif;
        font-size: 32px;
        text-shadow: 2px 2px 0px #fff;
        animation: move 0.12s cubic-bezier(0.51, 0.08, 0.82, 0.59) forwards;
    }

    @keyframes move {
        0% {
            opacity: 0;
            transform: translateX(-15px) scaleY(0.5);
        }
        40% {
            opacity: 1;
            transform: translateX(10px) scaleY(0.9);
        }
        100% {
            transform: translateY(0) scaleY(1);
        }
    }
</style>
