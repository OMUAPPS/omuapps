<script lang="ts">
    import AppPage from '$lib/components/AppPage.svelte';
    import AssetButton from '$lib/components/AssetButton.svelte';
    import Canvas from '$lib/components/canvas/Canvas.svelte';
    import { Gizmo } from '$lib/components/canvas/gizmo.js';
    import { GlProgram, type GlContext } from '$lib/components/canvas/glcontext.js';
    import { PoseStack } from '$lib/math/pose-stack.js';
    import { Vec2 } from '$lib/math/vec2.js';
    import { Vec4 } from '$lib/math/vec4.js';
    import { PNGTuber, type PNGTuberData } from '$lib/pngtuber/pngtuber.js';
    import { Timer } from '$lib/timer.js';
    import { OBSPlugin, permissions } from '@omujs/obs';
    import { Identifier, Omu } from '@omujs/omu';
    import { ASSET_DOWNLOAD_PERMISSION_ID, ASSET_UPLOAD_PERMISSION_ID } from '@omujs/omu/extension/asset/asset-extension.js';
    import { AppHeader, Combobox, setClient, Spinner } from '@omujs/ui';
    import { BROWSER } from 'esm-env';
    import { APP } from './app.js';
    import UserConfigEntry from './components/UserConfigEntry.svelte';
    import UserDragControl from './components/UserDragControl.svelte';
    import { DiscordOverlayApp, DISCORDRPC_PERMISSIONS, type AuthenticateUser, type Channel, type Config, type Guild, type VoiceStateUser } from './discord-overlay-app.js';
    import robo from './robo.json';
    import { GRID_FRAGMENT_SHADER, GRID_VERTEX_SHADER } from './shaders.js';

    const omu = new Omu(APP);
    const obs = OBSPlugin.create(omu);
    const overlayApp = new DiscordOverlayApp(omu);
    const { voiceState, speakingState, config } = overlayApp;
    setClient(omu);

    if (BROWSER) {
        omu.permissions.require(
            ...Object.values(DISCORDRPC_PERMISSIONS),
            ASSET_UPLOAD_PERMISSION_ID,
            ASSET_DOWNLOAD_PERMISSION_ID,
            permissions.OBS_SOURCE_READ_PERMISSION_ID,
            permissions.OBS_SOURCE_CREATE_PERMISSION_ID,
        );
        omu.start();
    }

    let defaultAvatar: PNGTuber;
    let gridProgram: GlProgram;
    let gizmo: Gizmo;
    let zoom = 1;
    let zoomLevel = 0;
    $: zoom = 2 ** zoomLevel;
    const timer = new Timer();

    async function init(context: GlContext) {
        defaultAvatar = await PNGTuber.load(context, robo);
        const vertexShader = context.createShader({source: GRID_VERTEX_SHADER, type: 'vertex'});
        const fragmentShader = context.createShader({source: GRID_FRAGMENT_SHADER, type: 'fragment'});
        gridProgram = context.createProgram([vertexShader, fragmentShader]);
        gizmo = new Gizmo(context);
        const entries = Object.entries($voiceState);
        for (const [, state] of entries) {
            await getAvatar(context, state.user);
        }
    }

    async function render(context: GlContext) {
        const entries = Object.entries($voiceState);
        const avatars: PNGTuber[] = [];
        for (const [, state] of entries) {
            const avatar = await getAvatar(context, state.user);
            avatars.push(avatar);
        }

        const { gl } = context;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        const poseStack = new PoseStack();
        poseStack.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1)
        poseStack.translate(gl.canvas.width / 2, gl.canvas.height / 2, 0);
        poseStack.scale(zoom, zoom, 1);

        const vertexBuffer = context.createBuffer();
        vertexBuffer.bind(() => {
            vertexBuffer.setData(new Float32Array([
                -1, -1, 0,
                1, -1, 0,
                -1, 1, 0,
                -1, 1, 0,
                1, -1, 0,
                1, 1, 0,
            ]), 'static');
        });
        const uvBuffer = context.createBuffer();
        uvBuffer.bind(() => {
            uvBuffer.setData(new Float32Array([
                0, 0,
                1, 0,
                0, 1,
                0, 1,
                1, 0,
                1, 1,
            ]), 'static');
        });

        gridProgram.use(() => {
            const resolutionUniform = gridProgram.getUniform('u_resolution').asVec2();
            resolutionUniform.set(new Vec2(gl.canvas.width, gl.canvas.height));
            const projectionUniform = gridProgram.getUniform('u_projection').asMat4();
            projectionUniform.set(poseStack.get().inverse());
            const gridColorUniform = gridProgram.getUniform('u_gridColor').asVec4();
            gridColorUniform.set(new Vec4(230 / 255, 230 / 255, 230 / 255, 1));
            const gridBackgroundUniform = gridProgram.getUniform('u_backgroundColor').asVec4();
            gridBackgroundUniform.set(new Vec4(0, 0, 0, 0));
            const positionAttribute = gridProgram.getAttribute('a_position');
            positionAttribute.set(vertexBuffer, 3, gl.FLOAT, false, 0, 0);
            const uvAttribute = gridProgram.getAttribute('a_texcoord');
            uvAttribute.set(uvBuffer, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        })
        
        const now = Date.now();
        entries.map(([id, state], index) => {
            const user = getUser(id);
            if (!user.show) return;
            const speakState = $speakingState[id];
            const timestamp = speakState?.speaking_start;
            const talkingTime = timestamp ? now - timestamp : 0; 
            poseStack.push();
            poseStack.translate(user.position[0], user.position[1], 0);
            poseStack.scale(0.5, 0.5, 1);
            const avatar = avatars[index];
            avatar.render(poseStack, {
                time: timer.getElapsedMS(),
                blinking: state.voice_state.self_mute,
                talking: speakState?.speaking,
                talkingTime,
            });
            poseStack.pop();
        });
    }

    const avatarCache = new Map<string, {id: string, avatar: PNGTuber}>();

    async function getAvatar(gl: GlContext, user: VoiceStateUser): Promise<PNGTuber> {
        const userConfig = getUser(user.id);
        if (!userConfig.avatar) {
            return defaultAvatar;
        }
        const avatar = await omu.assets.download(Identifier.fromKey(userConfig.avatar));
        const existing = avatarCache.get(user.id);
        if (existing && existing.id === userConfig.avatar) {
            return existing.avatar;
        }
        message = {
            type: 'loading',
            text: `${user.username}のアバターを読み込み中...`,
        }
        let parsedData: PNGTuberData;
        try {
            const { buffer } = avatar;
            parsedData = JSON.parse(new TextDecoder().decode(buffer));
            const pngtuber = await PNGTuber.load(gl, parsedData);
            avatarCache.set(user.id, { id: userConfig.avatar, avatar: pngtuber });
            message = null;
            return pngtuber;
        } catch (e) {
            console.error(e);
            message = {
                type: 'failed',
                text: `${user.username}のアバターの読み込みに失敗しました: ${e}`,
            }
            setTimeout(() => {
                message = null;
            }, 5000);
            return defaultAvatar;
        }
    }

    function invalidateAvatarCache(config: Config) {
        for (const [id, user] of Object.entries(config.users)) {
            if (!user.avatar) {
                avatarCache.delete(id);
            }
        }
    }

    $: {
        invalidateAvatarCache($config);
    }

    function getUser(id: string) {
        let user = $config.users[id];
        if (!user) {
            user = {
                show: true,
                position: [0, 0],
                scale: 1,
                avatar: null,
            };
            $config.users[id] = user;
        }
        return user;
    }

    $: Object.keys($voiceState).forEach(id => {
        getUser(id);
    });

    let message: {type: 'loading'| 'failed', text: string} | null = null;
    let dimentions: {width: number, height: number} = {width: 0, height: 0};

    let state: 'wait-for-ready' | 'connecting-vc' | null = 'wait-for-ready';
    let clients: Record<string, AuthenticateUser> = {};
    let guilds: Guild[] = [];
    let channels: Channel[] = [];

    omu.onReady(async () => {
        await overlayApp.waitForReady();
        clients = await overlayApp.getClients();
        state = null;
    })

    let last_user_id: string | null = null;
    let last_guild_id: string | null = null;
    let last_channel_id: string | null = null;
    async function update(user_id: string | null, guild_id: string | null, channel_id: string | null) {
        if (user_id === last_user_id && guild_id === last_guild_id && channel_id === last_channel_id) {
            return;
        }
        last_user_id = user_id;
        last_guild_id = guild_id;
        last_channel_id = channel_id;
        if (user_id) {
            guilds = (await overlayApp.getGuilds(user_id)).guilds;
        }
        if (user_id && guild_id) {
            channels = (await overlayApp.getChannels(user_id, guild_id)).channels.filter((channel) => channel.type === 2);
        }
        const foundsGuild = guilds.find((guild) => guild.id === guild_id);
        const foundChannel = channels.find((channel) => channel.id === channel_id);
        if (user_id && guild_id && channel_id && foundsGuild && foundChannel) {
            state = 'connecting-vc';
            await overlayApp.setVC(user_id, channel_id);
            state = null;
        }
    }
    
    $: {
        update($config.user_id, $config.guild_id, $config.channel_id);
    }
</script>

<AppPage>
    <header slot="header">
        <AppHeader app={omu.app} />
    </header>
    <main>
        <div class="controls">
            <div class="config">
                <span>
                    {#if Object.keys(clients).length > 0}
                        <p>
                            ユーザー
                            <i class="ti ti-user"/>
                        </p>
                        <Combobox options={Object.fromEntries(Object.entries(clients).map(([id, client]) => [id, {label: client.global_name, value: id}]))} bind:value={$config.user_id}/>
                    {/if}
                </span>
                <span>
                    {#if guilds.length > 0}
                        <p>
                            サーバー
                            <i class="ti ti-server"/>
                        </p>
                        <Combobox options={Object.fromEntries(guilds.map((guild) => [guild.id, {label: guild.name, value: guild.id}]))} bind:value={$config.guild_id}/>
                    {/if}
                </span>
                <span>
                    {#if channels.length > 0}
                        <p>
                            チャンネル
                            <i class="ti ti-volume"/>
                        </p>
                        <Combobox options={Object.fromEntries(channels.map((channel) => [channel.id, {label: channel.name, value: channel.id}]))} bind:value={$config.channel_id}/>
                    {/if}
                </span>
            </div>
            <div class="users">
                {#if state === 'connecting-vc'}
                    <p>
                        ボイスチャンネルに接続中
                        <Spinner />
                    </p>
                {:else if state === 'wait-for-ready'}
                    <p>
                        Discordを待機中
                        <Spinner />
                    </p>
                {:else}
                    {#each Object.entries($voiceState) as [id, state] (id)}
                        <UserConfigEntry {overlayApp} {id} {state}/>
                    {:else}
                        <p>
                            まだ誰も居ないようです…
                            <i class="ti ti-user-off"/>
                        </p>
                        <small>誰かがボイスチャンネルに入ると表示されます</small>
                    {/each}
                {/if}
            </div>
            <h3>
                配信に追加
                <i class="ti ti-arrow-bar-to-down" />
            </h3>
            <AssetButton {omu} {obs} />
        </div>
        <div class="canvas" bind:clientWidth={dimentions.width} bind:clientHeight={dimentions.height}>
            <Canvas {init} {render}/>
            <div class="avatar-controls">
                {#if dimentions}
                    {#each Object.entries($voiceState).filter(([id, ]) => $config.users[id]?.show) as [id, state] (id)}
                        <UserDragControl {dimentions} {overlayApp} {id} {state}/>
                    {/each}
                {/if}
            </div>
            <div class="camera-controls">
                <span class="zoom-level">
                    <i class="ti ti-zoom-in"/>
                    <input type="range" bind:value={zoomLevel} min={-2} max={2} step={0.01}/>
                    <i class="ti ti-zoom-out"/>
                </span>
            </div>
            {#if message}
                <div class="message">
                    {#if message.type === 'loading'}
                        <p>
                            {message.text}
                            <Spinner />
                        </p>
                    {/if}
                </div>
            {/if}
        </div>
    </main>
</AppPage>

<style lang="scss">
    :global(body) {
        overflow: hidden;
    }

    main {
        position: absolute;
        inset: 0;
        color: var(--color-1);
        container-type: inline-size;
        display: flex;
        flex-direction: row;
        margin: 1rem;
        gap: 1rem;
    }

    .canvas {
        position: relative;
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        outline: 1px solid #e6e6e6;
    }

    .controls {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 20rem;
    }

    .config {
        display: flex;
        flex-direction: column;
        gap: 1rem;

        > span {
            display: flex;
            gap: 1rem;
            align-items: center;
            justify-content: space-between;
            white-space: nowrap;
        }
    }

    .avatar-controls {
        position: absolute;
        inset: 0;
    }

    .camera-controls {
        position: absolute;
        bottom: 1rem;
        right: 1rem;

        > .zoom-level {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1rem;
            font-weight: 600;
        }
    }

    .message {
        position: absolute;
        top: 10rem;
        padding: 0.5rem 2rem;
        background: var(--color-bg-2);
        color: var(--color-1);
        font-weight: 600;
        font-size: 1rem;
    }

    .users {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 0.5rem 0;
        background: var(--color-bg-2);

        > p {
            text-align: center;
            font-weight: 600;
            font-size: 1rem;
            color: var(--color-1);
            margin-top: 2rem;
        }

        > small {
            text-align: center;
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--color-text);
        }
    }

    @container (width < 800px) {
        .container {
            flex-direction: column-reverse;
            gap: 1rem;
        }
    }
</style>
