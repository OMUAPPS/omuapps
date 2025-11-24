<script lang="ts">
    export let value: boolean;
    export let handleToggle = () => {
        value = !value;
    };
</script>

<button class:active={value} on:click={handleToggle}>
    <span class="off">off</span>
    <span class="on">on</span>
</button>

<style lang="scss">
    button {
        display: flex;
        height: 100%;
        background: var(--color-bg-1);
        color: var(--color-text);
        border: 1px solid var(--color-border);
        cursor: pointer;
        font-weight: 600;
        font-size: 0.8rem;
        padding: 0.2rem;
        color: var(--color-1);
        outline: 1px solid var(--color-outline);
        border-radius: 0.1rem;

        &:focus-visible {
            outline: 2px solid var(--color-1);
        }
    }

    button.active {
        .on {
            background: var(--color-1);
            color: var(--color-bg-2);
        }
        .off {
            background: var(--color-bg-1);
            color: var(--color-outline);
        }

        &:hover {
            .off {
                outline: 1px solid var(--color-1);
                outline-offset: -2px;
            }
        }
    }

    button:not(.active) {
        .on {
            background: var(--color-bg-1);
            color: var(--color-outline);
        }
        .off {
            background: var(--color-bg-2);
            color: var(--color-1);
        }

        &:hover {
            .on {
                outline: 1px solid var(--color-1);
                outline-offset: -2px;
            }
        }
    }

    span {
        display: inline-block;
        padding: 0.5rem 1rem;
        border-radius: 0.1rem;
    }
</style>
