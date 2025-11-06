<main>
    <slot />
</main>

<style>
    main {
        container-type: inline-size;
        box-sizing: border-box;
        display: flex;
        flex: 1;
        flex-direction: column;
        width: min(100%, 70rem);
        max-width: 70rem;
        padding: 0 4rem;
        margin: 0 auto;
    }
</style>
