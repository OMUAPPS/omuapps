<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-loader-2">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M12 3a9 9 0 1 0 9 9" />
</svg>
  
<style lang="scss">
    svg {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--color-1);
        border: none;
        animation: spin 1s linear infinite;
        transform-origin: center;
        line-height: 1;
        width: 1em;
        height: 1em;
        vertical-align: -0.125em;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }

        100% {
            transform: rotate(360deg);
        }
    }
</style>
