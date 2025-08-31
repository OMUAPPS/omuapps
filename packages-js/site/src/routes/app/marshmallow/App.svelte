<script lang="ts">
    import { OBSPlugin } from "@omujs/obs";
    import type { Omu } from "@omujs/omu";
    import { onMount } from "svelte";
    import { MarshmallowApp } from "./marshmallow-app.js";

    export let omu: Omu;
    export let marshmallow: MarshmallowApp;
    export let obs: OBSPlugin;
    const SCRIPT = `
    const regex = /^\\/?[\\w]+$/gm;
    if (regex.test(location.pathname)) {
        close();
    }`;

    onMount(async () => {
        const allowed = await omu.dashboard.requestHost({
            host: "marshmallow-qa.com",
        });
        if (allowed.type !== "ok")
            throw new Error("Failed to request host permission");
        const handle = (
            await omu.dashboard.requestWebview({
                url: "https://marshmallow-qa.com/session/new",
                script: SCRIPT,
            })
        ).unwrap();
        await handle.join();
        const cookies = await handle.getCookies();
        console.log(
            cookies.find(({ name }) => name === "_marshmallow_session"),
        );
    });
</script>

<main></main>

<style lang="scss">
    main {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: row;
        height: 100%;
    }
</style>
