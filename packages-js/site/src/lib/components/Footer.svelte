<script lang="ts">
    import { Tooltip } from '@omujs/ui';
</script>

<footer>
    <div class="category">
        <p>
            Social
            <i class="ti ti-share"></i>
        </p>
        <a href="https://github.com/OMUAPPS/omuapps">
            <p>
                <i class="ti ti-brand-github"></i>
                Github
                <i class="ti ti-external-link"></i>
            </p>
        </a>
        <a href="https://twitter.com/omuapps">
            <p>
                <i class="ti ti-brand-twitter"></i>
                Twitter
                <i class="ti ti-external-link"></i>
            </p>
        </a>
        <a href="https://discord.gg/MZKvbPpsuK">
            <p>
                <i class="ti ti-brand-discord"></i>
                Discord
                <i class="ti ti-external-link"></i>
            </p>
        </a>
    </div>
    <div class="category">
        <p>
            Legal
            <i class="ti ti-file"></i>
        </p>
        <a href="/legal/privacy">
            <p class="between">
                <Tooltip>
                    <p class="hint">使っていただける方へお約束</p>
                </Tooltip>
                プライバシーポリシー
                <i class="ti ti-external-link"></i>
            </p>
        </a>
        <a href="/legal/terms">
            <p class="between">
                <Tooltip>
                    <p class="hint">使っていただくにあたって</p>
                </Tooltip>
                利用規約
                <i class="ti ti-external-link"></i>
            </p>
        </a>
        <p style:text-align="end" style:margin-top="auto">
            <a href="https://x.com/2ji_han">🕝</a>
        </p>
    </div>
</footer>

<style lang="scss">
    footer {
        display: flex;
        justify-content: space-between;
        gap: 2rem;
        height: fit-content;
        width: 100%;
        margin-top: 10rem;
        border-top: 1px solid var(--color-outline);
        color: var(--color-1);
        padding: 2rem 0;
    }

    p {
        font-weight: 200;
    }

    .between {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 1rem;
        width: 100%;
        font-size: 0.8rem;
    }

    .category {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        > p {
            margin-bottom: 0.25rem;
            text-transform: uppercase;
            font-size: 0.75rem;
            font-weight: bold;
        }

        > a {
            color: var(--color-1);
            font-size: 0.8rem;
            display: flex;
            align-items: center;
        }
    }

    .hint {
        font-weight: bold;
    }
</style>
