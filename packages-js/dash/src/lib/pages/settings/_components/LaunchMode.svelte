<script lang="ts">
    import { obs } from '$lib/client';

    let installed = await obs.checkInstalled();
    let isAutoLaunchEnabled = $state(installed.launch_installed);
</script>

<h3>起動方法</h3>
<button>
    自動起動
</button>
<button>
    手動起動
</button>
