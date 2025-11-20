<script lang="ts">
    import { loadI18n } from '@omujs/i18n';
    import { translate } from '../stores.js';

    const load = async () => {
        const i18n = await loadI18n(
            () => import('../../../../dash/src/lib/i18n/locales/ja-JP.json'), // FIXME: This is a hack.
            'ja-JP',
        );
        translate.set(i18n.translate);
    };
</script>

{#await load()}
    {@render children?.()}
{:then}
    {@render children?.()}
{/await}
