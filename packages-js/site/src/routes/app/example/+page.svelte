<script lang="ts">
    import { App, BrowserSession, Omu, OmuPermissions } from '@omujs/omu';
    import { onMount } from 'svelte';

    const PARENT_APP = new App('com.example:my-keisatsu', {
        version: '1.0.0',
        metadata: {
            locale: 'ja',
            name: '草警察',
            description:
                '【2025年最新版】草を投稿した人を自動で検出して収集するアプリ',
        },
    });
    const omu = new Omu(PARENT_APP);

    onMount(async () => {
        const CHILD_APP = new App('com.omuapps:child', {
            parentId: PARENT_APP, // 親が設定されている必要があります
            url: 'omuapps.com/app/child',
        });
        omu.sessions.require(CHILD_APP);
        const observer = omu.sessions.observe(CHILD_APP);
        observer.onConnect((app) => {
            console.log(`Child connected: ${app.id.key()}`);
        });
        observer.onDisconnect((app) => {
            console.log(`Child connected: ${app.id.key()}`);
        });
        const params = await omu.sessions.generateToken({
            app: CHILD_APP,
            permissions: [
                OmuPermissions.ASSET_PERMISSION_ID,
            ],
        });
        // { token, address }
        console.log(params.token); // 子の接続に使うトークン
        console.log(params.address); // 接続用アドレス
        const url = new URL('https://omuapps.com/app/child');
        url.searchParams.set(BrowserSession.PARAM_NAME, JSON.stringify(params));
        // urlを開くことで子アプリの接続ができます

        const resp = await omu.http.fetch('https://omuapps.com/apps.json'); // window.fetchと同様の引数
        console.log(await resp.json()); // Responseが実装されています

        // WebSocketとは異なり、イベントの順序を考える必要がないため簡単に操作できます
        const socket = await omu.http.ws('wss://echo.websocket.org');
        socket.send('Hello, world!');
        while (true) {
            const msg = await socket.receive();
            if (msg.type === 'close') break;
            if (msg.type === 'text') {
                console.log(msg.data); // Hello, world!
            }
        }

        const ws = await omu.http.ws('wss://echo.websocket.org');
        const webSocket = ws.toWebSocket(); // .toWebSocket()で標準のWebSocketとして扱うこともできます
        webSocket.onmessage = (message) => {
            console.log('msg:', message.data);
        };

        const drag = await omu.dashboard.requestDragDrop();
        drag.onDrop(async (event) => {
            console.log(event.drag_id); // ドラッグID
            const file = event.files[0]; // ファイルの配列
            console.log(file.name); // ファイル名
            console.log(file.size); // ファイルサイズ
            console.log(file.type); // ファイルかディレクトリかどうか
            const { meta, files } = await drag.read(event.drag_id);
            console.log(meta.files); // 上記と同様
            console.log(files); // ファイルのファイル名をキーに、ファイル内容を値に持つオブジェクト
            console.log(files['ファイル名'].buffer); // Uint8Arrayのファイル内容
            console.log(files['ファイル名'].file === file); // 上記のfileと同様
        });
        drag.onEnter((event) => {
            // ファイルを持って管理画面に入った時
            console.log(event);// onDropのeventと同様
        });
        drag.onLeave((event) => {
            // 解除されたとき
            console.log(event);// onDropのeventと同様
        });

        const webview = await omu.dashboard.requestWebview({
            url: 'https://omuapps.com', // 開くURL
            script: 'console.log("Hello, ${location.host}")', // 起動と同時に読み込まれるスクリプト
        });

        const cookies = await webview.getCookies();
        console.log(cookies[0].name); // クッキーの名前
        console.log(cookies[0].value); // クッキーの値

        await webview.join(); // 閉じるのを待機
        await webview.close(); // 強制的に閉じる

        const speechRecognition = await omu.dashboard.requestSpeechRecognition();

        speechRecognition.listen((state) => {
            if (state.type === 'audio_started') {
                // 音が始まった
                console.log(state.timestamp); // 音が始まった時間
            }
            if (state.type === 'audio_ended') {
                // 音が終わった
                console.log(state.timestamp); // 音が終わった時間
            }
            if (state.type === 'result') {
                // 認識された
                console.log(state.segments);
            }
            if (state.type === 'final') {
                // 認識が終了した
                console.log(state.segments);
                console.log(state.segments[0].transcript); // 認識された文字列
            }
        });
    });
</script>
