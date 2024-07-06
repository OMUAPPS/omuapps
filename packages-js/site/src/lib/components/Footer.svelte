<script lang="ts">
    import { FlexColWrapper, FlexRowWrapper, Tooltip } from '@omujs/ui';
</script>

<footer>
    <FlexRowWrapper gap between heightFull>
        <FlexColWrapper gap>
            <a href="https://github.com/OMUAPPS/omuapps">
                <p>
                    <i class="ti ti-brand-github" />
                    Github
                    <i class="ti ti-external-link" />
                </p>
            </a>
            <a href="https://twitter.com/omuapps">
                <p>
                    <i class="ti ti-brand-twitter" />
                    Twitter
                    <i class="ti ti-external-link" />
                </p>
            </a>
            <a href="https://discord.gg/MZKvbPpsuK">
                <p>
                    <i class="ti ti-brand-discord" />
                    Discord
                    <i class="ti ti-external-link" />
                </p>
            </a>
        </FlexColWrapper>
        <div class="legal">
            <a href="/legal/privacy">
                <p class="between">
                    <Tooltip>
                        <p class="hint">使っていただける方へお約束</p>
                    </Tooltip>
                    プライバシーポリシー
                    <i class="ti ti-external-link" />
                </p>
            </a>
            <a href="/legal/terms">
                <p class="between">
                    <Tooltip>
                        <p class="hint">使っていただくにあたって</p>
                    </Tooltip>
                    利用規約
                    <i class="ti ti-external-link" />
                </p>
            </a>
            <p style="text-align: end; margin-top: auto;">
                <a href="https://x.com/2ji_han">🕝</a>
            </p>
        </div>
    </FlexRowWrapper>
</footer>

<style lang="scss">
    footer {
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

    .hint {
        font-weight: bold;
    }
</style>
