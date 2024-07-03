<script lang="ts">
    import { FlexColWrapper, FlexRowWrapper } from '@omujs/ui';
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
        <p style="text-align: end; margin-top: auto;">
            <a href="https://x.com/2ji_han">🕝</a>
        </p>
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
</style>
