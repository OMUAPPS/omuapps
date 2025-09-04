<script lang="ts">
    import { App, Identifier, Omu } from "@omujs/omu";
    import { client } from "../stores.js";

    const app = new App(Identifier.fromKey("com.omuapps:test"), {
        version: "1.0.0",
    });
    const omu = new Omu(app);
    client.set(omu);
</script>

<slot />
