<script lang="ts">
    import { t } from '$lib/i18n/i18n-context.js';
    import { ExternalLink, FlexColWrapper } from '@omujs/ui';

    interface Contributor {
        login: string;
        id: number;
        node_id: string;
        avatar_url: string;
        gravatar_id: string;
        url: string;
        html_url: string;
        followers_url: string;
        following_url: string;
        gists_url: string;
        starred_url: string;
        subscriptions_url: string;
        organizations_url: string;
        repos_url: string;
        events_url: string;
        received_events_url: string;
        type: 'User' | 'Organization' | 'Bot';
        site_admin: boolean;
        contributions: number;
    }

    const contributorsUrl = 'https://api.github.com/repos/OMUAPPS/omuapps/contributors';
    let contributors: Contributor[] = [];

    fetch(contributorsUrl)
        .then((res) => res.json())
        .then((data: Contributor[]) => {
            contributors = data
                .filter((contributor) => contributor.type !== 'Bot')
                .sort((a, b) => b.contributions - a.contributions);
        });
</script>

<FlexColWrapper widthFull gap>
    <h2>
        <i class="ti ti-code"></i>
        {$t('settings.about.contributors')}
    </h2>
    {#each contributors as contributor}
        <ExternalLink href={contributor.html_url}>
            <h4>
                {contributor.login}
                <i class="ti ti-external-link"></i>
            </h4>
        </ExternalLink>
    {/each}
</FlexColWrapper>

<style lang="scss">
    h4 {
        width: 100%;
        margin: 0;
    }
</style>
