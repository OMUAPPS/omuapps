<script lang="ts">
    import { Tooltip } from '@omujs/ui';
</script>

<a class="card" href="https://github.com/omuapps">
    <Tooltip>
        <p>OMUAPPSのソースコード</p>
    </Tooltip>
    <i class="ti ti-brand-github" />
    <p>オープンソース</p>
    <i class="ti ti-external-link" />
</a>
<a class="card" href="https://discord.gg/MZKvbPpsuK">
    <Tooltip>
        <p>OMUAPPSのDiscordコミュニティ</p>
    </Tooltip>
    <i class="ti ti-brand-discord" />
    <p>コミュニティ</p>
    <i class="ti ti-external-link" />
</a>
<a class="card" href="https://x.com/omuapps">
    <Tooltip>
        <p>OMUAPPSの情報発信</p>
    </Tooltip>
    <i class="ti ti-brand-x" />
    <p>情報発信</p>
    <i class="ti ti-external-link" />
</a>

<style lang="scss">
    .card {
        width: fit-content;
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 0.75rem 1rem;
        background: var(--color-bg-2);
        margin-bottom: 0.5rem;
        font-size: 0.8rem;
        text-decoration: none;
        white-space: nowrap;

        > i {
            font-size: 1.25rem;
            color: var(--color-1);
        }

        > p {
            margin-left: 0.5rem;
        }

        .ti-external-link {
            font-size: 0.75rem;
            color: var(--color-1);
            margin-left: 0.25rem;
        }

        &:hover {
            outline: 0.125rem solid var(--color-1);
            outline-offset: -0.125rem;
        }
    }
</style>
