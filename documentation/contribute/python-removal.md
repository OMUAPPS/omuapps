# Python撤去の設計

この文書はPythonを取り除いたあとの構成と、そこへ移る順序を決める。型とモジュールの書き方は「設計原則」に従う。

## 範囲

### 移行後の構成

| 部品 | 現在 | 移行後 |
|---|---|---|
| サーバー | `packages-py/server`。Tauriがuvで PyPI から入れる | `packages-js/server`。Bunで単一の実行ファイルにし、ダッシュボードに同梱する |
| チャット | `packages-py/chat`、`chat-provider`、`chat-youtube`、`chat-twitch`、`chat-picarto` | `packages-js/chat`と`packages-js/chat-provider`。サーバーのプラグインとして静的に登録する |
| OBSプラグイン | OBSのPythonスクリプトと`packages-py/plugin-obs` | `packages-cpp/plugin-obs`。C++で書いたOBSの正規のプラグイン |
| Python実行環境 | Tauriが起動時に取得する | なし |

`packages-py`、`pyproject.toml`、`uv.lock`、`requirements.lock`、`requirements-dev.lock`は最後にすべて消す。

### 対象のOS

最初はWindowsだけに出す。OSで変わる処理は1つの型にまとめ、macOSとLinuxはその型の実装を足すだけで対応できるようにする。

### サードパーティ製のプラグインを受け付けない

サーバーのプラグインは同梱したものだけにする。外部から読み込む仕組み、依存の解決、パッケージの取得は作らない。

## サーバー

### サーバーはダッシュボードと同じ版で配る

サーバーは`bun build --compile`で実行ファイルにし、Tauriの`externalBin`でダッシュボードに同梱する。サーバーの版とダッシュボードの版は常に一致する。

版が食い違う前提の処理は持たない。次のものを消す。

- `server.rs`の`REQUIREMENTS`と`DEPRECATED_REQUIREMENTS`
- 版を比べてuvで更新する処理
- `python.rs`、`uv.rs`、`sources/py`

### プロトコルの定義は`@omujs/omu`だけに置く

パケット、エンドポイント、テーブル、レジストリの型は`@omujs/omu`に1つだけ定義し、クライアントとサーバーの両方がそれを`import`する。サーバーに同じ定義を書き写さない。

今は大半の定義がモジュールの中に閉じている。各`api/*/index.ts`から公開する。

悪い例

```ts
const TABLE_ITEM_ADD_PACKET = PacketType.createSerialized<TableItemsPacket>(TABLE_EXTENSION_TYPE, {
    name: 'item_add',
    serializer: TableItemsPacket,
});
```

良い例

```ts
import { TABLE_ITEM_ADD_PACKET } from '@omujs/omu/api/table';
```

定義が2か所にあると、片方だけ直したときにクライアントとサーバーが黙って食い違うためである。

### 定義の食い違いは`@omujs/omu`の側で直す

PythonとJSの定義を比べると次の食い違いがある。サーバーを書く前に`@omujs/omu`の側をPython版に合わせる。

| 定義 | Python版 | JS版 | 直し方 |
|---|---|---|---|
| `DASHBOARD_PROMPT_CLEAR_BLOCKED` | 権限`DASHBOARD_SET_PERMISSION_ID` | 権限なし | JS版に権限を足す |
| `EndpointRegisterPacket.deserialize` | 空の文字列を権限なしとして読む | 空の文字列を`Identifier.fromKey`に渡して失敗する | 空の文字列を`undefined`として読む |
| `DASHBOARD_STARTUP_APPS` | 権限`all`に`DASHBOARD_SET_PERMISSION_ID`、`read`に`DASHBOARD_APP_STARTUP_PERMISSION_ID` | 権限なし | JS版に権限を足す |
| `I18N_LOCALES_REGISTRY_TYPE` | 権限`read`と`write`に言語設定の権限 | 権限なし | JS版に権限を足す |
| `PLUGIN_ALLOWED_PACKAGE_TABLE` | 権限`read`に`PLUGIN_READ_PACKAGE_PERMISSION_ID` | 権限なし | JS版に権限を足す |
| `HTTP_ALLOWED_PORTS` | あり | なし | JS版に足す |

テーブルとレジストリの権限はサーバーが登録するときに使うので、クライアントだけが使っていた今までは食い違いが表に出なかった。

今までJS版の`deserialize`はサーバーからの受信でしか使われていなかった。サーバーがJS版で受信するようになると、ほかにも食い違いが見つかる。互換性のテストで洗い出す（「移行の順序」を参照）。

### 既存の保存データをそのまま読む

保存の形式は変えない。新しい版を入れた利用者が、移行の処理なしで今までのデータを使えるようにする。

| データ | 場所 | 形式 |
|---|---|---|
| アプリと権限 | `data/security/apps.json`、`permissions.json` | JSON |
| レジストリ | `data/registry/<識別子のパス>` と同じ名前の`.json` | 値のバイト列と権限のJSON |
| テーブル | `data/tables/<識別子のパス>.db` | SQLite。表`data(id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE, value BLOB)` |
| アセット | `assets/<識別子のパス>`、`assets/index.sqlite` | ファイルとSQLite |
| 版 | `VERSION` | テキスト |

`<識別子のパス>`はPython版の`Identifier.get_sanitized_path`と1文字も違わない結果にする。名前空間とパスのそれぞれで、Pythonの`[^\w]`にあたる文字を`_`に置き換え、元の文字列のMD5を付ける。Pythonの`\w`はUnicodeの文字と数字を含むので、JSでは`/[^\p{L}\p{N}_]/gu`にする。

この処理はサーバーの`storage`モジュールに`StoragePath`の型を作って置く。テーブル、レジストリ、アセットはどれもこの型からパスを受け取り、それぞれに同じ処理を書かない。

悪い例

```ts
class TableStore {
    public static pathFor(id: Identifier): string {
        ...
    }
}
```

良い例

```ts
const path = StoragePath.of(id);
```

`Identifier`のメソッドにはしない。ファイルの置き場所はサーバーの都合で、`@omujs/omu`がそれを知ると下の層が上の層を知ることになるためである。`@omujs/omu`はブラウザでも動き、ブラウザにはMD5がないこともある。

Python版との一致は`packages-js/server/test/fixtures/python-data.json`の見本で確かめる。見本には、Pythonの`\w`が文字として扱う`①`や、文字として扱わない結合文字（`e`と`U+0301`）を含める。

### 起動の引数を変えない

サーバーの引数は今と同じにする。Tauriの側の変更を、起動するファイルを差し替えるだけにするためである。

| 引数 | 意味 |
|---|---|
| `--port`、`--hash` | 待ち受けるポートと、アドレスのハッシュ |
| `--token`、`--token-file` | ダッシュボードのトークン |
| `--dashboard-path` | ダッシュボードの実行ファイル |
| `--trusted-host` | 信頼するホストの対応（`src=dst`） |
| `--stop` | 同じポートで動いているサーバーを止める |
| `--uninstall` | 各プラグインの片付けを呼ぶ |
| `--debug` | デバッグの出力 |

`--index-url`はPyPIの取得先なので消す。再起動の終了コード`100`は残す。

### 画面を出さない

サーバーはダイアログを出さない。Python版がtkinterで出していた確認は次のように移す。

| 確認 | 移し先 |
|---|---|
| ポートを使っているプロセスを止めるか | Tauri。サーバーを起動する前に確かめる |
| OBSを閉じるか | ダッシュボードのインストーラー。プラグインを置く前に確かめる |

サーバーはダッシュボードと同梱するので、利用者に何かを尋ねる経路はダッシュボードの側に揃えるためである。

### プラグインは外部プロセスで動かさない

Python版は`isolated`のプラグインを別のプロセスで動かしていた。移行後はすべて同じプロセスで動かす。プラグインのクライアントは、メモリの中の接続で`plugin`の種類のセッションとして接続する。

### モジュールと層

`packages-js/server/src`の直下のフォルダーを1つのモジュールにする。下の表で上にあるモジュールほど下の層にする。

| 層 | モジュール | 持つもの |
|---|---|---|
| 1 | `storage` | テーブル、レジストリ、アセットの読み書き。保存の形式を知るのはここだけ |
| 1 | `network` | `Bun.serve`、WebSocketの接続、HTTPの経路、CORS |
| 1 | `system` | ポートを使っているプロセスの一覧と終了。OSごとの実装を起動したときに1回だけ選ぶ |
| 2 | `security` | アプリの登録、トークン、権限 |
| 3 | `session` | 接続の手順、暗号化、準備完了までの処理、パケットの振り分け |
| 4 | `api` | 拡張ごとのフォルダー（`table`、`registry`、`endpoint`、`signal`、`session`、`permission`、`dashboard`、`server`、`http`、`asset`、`i18n`、`logger`、`plugin`） |
| 5 | `plugins` | 同梱するプラグインの一覧 |
| 6 | `server` | 全体の組み立てと起動の引数 |

`network`は`session`を知らない。届いたパケットを渡す先は`network`の`interface`として定義し、`server`が組み立てるときに結ぶ。

### アプリの種類で分岐しない

Python版は`session.kind`が`dashboard`、`plugin`、`remote`のどれかで、権限の確認を飛ばすかどうかを各所で分けていた。移行後は種類による違いを接続のときに作る権限のハンドルに持たせ、各拡張は種類を見ない。

悪い例

```ts
if (session.app.type === 'dashboard') return;
if (!session.permissions.has(permission)) throw new PermissionDenied(message);
```

良い例

```ts
session.permissions.require(permission);
```

ダッシュボードとプラグインには、すべての権限を持つハンドルを渡す。種類を足したときに、分岐を探して直さずに済むためである。

種類そのものが条件になっているところ（`remote`は権限を要求できない、`dashboard`だけがダッシュボードとして登録できる）は、権限のハンドルが持つ能力として名前を付ける。

### セッションと資源の組はBindingにする

テーブル、レジストリ、シグナルを購読しているセッションは、資源とセッションの組のBindingで表す。Python版の`SessionTableListener`にあたる。切断されたときの片付けはBindingが持つ。

良い例

```ts
class TableSessionBinding {
    public constructor(public readonly table: ServerTable, public readonly session: Session) {
        ...
    }

    public close(): void {
        ...
    }
}
```

### 保存の形と実行時の値を分ける

`apps.json`の1件は`AppEntryJSON`、実行時の値は`AppEntry`にする。JSONの形のまま比べたり書き換えたりしない。

Python版はアプリの`metadata`が変わったかを`json.dumps`の文字列で比べていた。キーの順番が違うだけで変化と判定してしまうので、`AppEntry`の側で値として比べる。

### Python版の不具合は移すときに直す

移植の途中で見つかったPython版の不具合は、TS版で同じ動きを再現せずに直す。直したものはこの表に足す。

| 不具合 | 直し方 |
|---|---|
| `SessionExtension.on_disconnected`がどこからも呼ばれず、切断したアプリがセッションの表に残る | 切断したときに呼ぶ |
| 切断を知らせる相手が閉じているかを、切断した側のセッションで確かめていて、通知が送られない | 知らせる相手のセッションで確かめる |
| `metadata`の比較がキーの順番に左右される | 値として比べる |
| 保存した`dependencies`が`null`で、JS版の`App`が`{}`を送ると、変化したと判定する | `null`、`undefined`、空のオブジェクトを同じとみなす |
| 中継中のエンドポイントの呼び出しを、エンドポイントと呼び出し側の番号の組で覚えていて、別のアプリが同じ番号で呼ぶと応答が入れ替わる | サーバーが一意の番号を振り直し、応答を返すときに呼び出し側の番号に戻す |
| シグナルの権限をキー`notify`で読み、JS版のクライアントが送る`send`を無視している | `send`で読む |
| `ip_verified and origin_verified`が常に後ろの結果を返し、接続元のアドレスを確かめていない | アドレスと`Origin`の両方を確かめる。ループバックには`::1`も含める |
| 未知のフレームのトークンで`KeyError`が起きる | 正しくないトークンとして扱う |
| WebSocketを作るときの重複の確認でHTTPの一覧を見ている | WebSocketの一覧を見る |
| 子アプリの権限のハンドルを親のハンドルで絞るはずが、親のハンドルを子のIDで作っていて、子の権限が親の権限で絞られていない | 子と親の両方が持つ権限だけを有効にする |

クライアントの側にも、Python版のサーバーでは表に出なかった食い違いがあった。

| 食い違い | 直し方 |
|---|---|
| `READY`の型が`PacketType<undefined>`で、`undefined`を送るとJSONが空になる。Python版は`null`を送っていた | `PacketType<null>`にする |
| WebSocketの受信がBlobを前提にしていて、Bunで受け取る`ArrayBuffer`を読めない | `binaryType`を`arraybuffer`にし、Blobも読めるようにする |

## プラグイン

### 同梱するプラグインは一覧で登録する

プラグインは`plugins`モジュールの一覧に書く。読み込みの順番は一覧の順番にする。

良い例

```ts
class BundledPlugins {
    public static readonly all: readonly ServerPlugin[] = [
        ChatPlugin.instance,
        ChatProviderPlugin.instance,
        ObsPlugin.instance,
    ];
}
```

`ServerPlugin`は、起動、停止、片付けの3つを持つ。インストールと更新の通知は持たない。同梱するプラグインはサーバーと同じ版でしか存在しないためである。

### アプリからの要求はプラグインの名前で照合する

アプリは`PLUGIN_REQUIRE_PACKET`でPythonのパッケージの名前（`omu_chat`、`omu_chat_youtube`など）と版の指定を送ってくる。既存のアプリを変えずに動かすため、各`ServerPlugin`は今までのパッケージの名前を持ち、要求はその名前で照合する。版はサーバーの版として比べる。

次のものは消す。

- PyPIから情報を取る処理と、依存の解決
- `PLUGIN_ALLOWED_PACKAGE_TABLE`への書き込みと、プラグインの導入を確かめるプロンプト（`app/plugins`）
- `PLUGIN_RELOAD_ENDPOINT_TYPE`のモジュールの読み直し。プラグインの停止と起動だけにする

### チャット

`packages-js/chat`は今のとおりブラウザのアプリが使うモデルと型を持つ。サーバーで動く処理は新しい`packages-js/chat-provider`に置く。配信サイトから取得する処理と、そのための依存をブラウザのアプリの束に入れないためである。

`chat-provider`は配信サイトごとのフォルダー（`youtube`、`twitch`、`picarto`）をモジュールにする。Python版の`ProviderService`は「URLかチャンネルから部屋を見つけ、部屋のチャットを流す」という責任を言えるので、`interface ChatProvider`として残す。各配信サイトはその実装にする。

作業中の`room_check_test.py`と`transient_failure_test.py`は、同じ場面をTSのテストに移してから実装を移す。

### iwashiはこのリポジトリでTSに作り直す

`omu_chat`はURLからリンクをたどってチャンネルの一覧を作るのに、外部のPythonのパッケージ`iwashi`を使っている。これを`packages-js/iwashi`として作り直す。Pythonの版の移植でなく、TSで扱いやすい形に設計し直す。

`iwashi`の責任は「URLから始めて、プロフィールに書かれたリンクをたどり、見つけたアカウントの木を作る」こととする。チャットの都合（配信サイトかどうか、`Channel`への変換）は持たない。`Channel`への変換は`chat-provider`が持つ。

サイトごとの処理は`interface SiteVisitor`の実装にする。`SiteVisitor`は「URLが自分のサイトかを判定する」「URLからアカウントのIDを決める」「アカウントのページを読み、プロフィールとリンクを返す」の3つを持つ。たどる順番、訪れたURLの記録、同じサイトへの間隔の調整は`SiteVisitor`に持たせず、1回の探索を表す`Crawl`が持つ。

Python版は探索の途中の状態（`Context`）を各サイトの処理へ引数で渡し、各サイトの処理が親の結果に子を書き足していた。移行後は各サイトの処理は見つけたものを返すだけにし、木を組み立てるのは`Crawl`にする。

悪い例

```ts
class LinktreeVisitor {
    public async visit(context: Context, id: string): Promise<void> {
        const result = context.createResult(...);
        context.enqueueVisit(url);
    }
}
```

良い例

```ts
class LinktreeVisitor implements SiteVisitor {
    public async visit(id: string): Promise<SiteProfile> {
        ...
    }
}
```

各サイトの処理を、探索の仕組みを知らずに単独でテストできるようにするためである。

`chat-provider`の`youtube`は、YouTubeのページを読む処理を`iwashi`の`youtube`と共有する。同じ処理を2か所に持たない。

Python版の対応するサイトは26ある。すべてを段階3で移す。配信サイトでないサイト（linktree、litlink、Xなど）も、配信サイトへのリンクを見つける経路になるためである。

## OBSプラグイン

### C++で正規のプラグインにする

OBSのプラグインはC++で書き、`obs-plugintemplate`のCMakeの構成を使う。`libobs`と`obs-frontend-api`だけに依存する。

Rustは使わない。OBSの参照の数え方（`obs_source_release`など）とスレッドの決まりを、bindgenを通して自分で守ることになるためである。C++では`obs.hpp`の`OBSSourceAutoRelease`などで所有を型に持たせる。

悪い例

```cpp
obs_source_t *source = obs_get_source_by_name(name.c_str());
auto json = SourceJson::from(source);
obs_source_release(source);
return json;
```

良い例

```cpp
OBSSourceAutoRelease source = obs_get_source_by_name(name.c_str());
return SourceJson::from(source);
```

### プラグインの仕様は`packages-js/plugin-obs`にする

C++のプラグインが応えるエンドポイントとシグナルは`packages-js/plugin-obs/src/types.ts`に定義したものにする。これを仕様とし、C++の側で名前とJSONの形を変えない。

| 種類 | 名前 |
|---|---|
| ソース | `source_create`、`source_add`、`source_update`、`source_remove_by_name`、`source_remove_by_uuid`、`source_get_by_name`、`source_get_by_uuid`、`source_list` |
| ブラウザー | `browser_create`、`browser_add` |
| シーン | `scene_list`、`scene_get_by_name`、`scene_get_by_uuid`、`scene_get_current`、`scene_set_current_by_name`、`scene_set_current_by_uuid`、`scene_create` |
| スクリーンショット | `screenshot_create`、`screenshot_get_last_binary` |
| シグナル | `event_signal` |

`check_installed`と`set_install`はOBSの中ではなくサーバーの`ObsPlugin`が応える。`set_install`はOBSを起動したときにダッシュボードを起動する設定（`launch_active`）だけを扱い、プラグインのファイルは置かない。

### C++で実装するプロトコルは必要な分だけにする

C++のプラグインはアプリ`com.omuapps:plugin-obs`として接続する。実装するのは次の範囲だけにする。

- フレーム（パケットの種類の文字列と本体のバイト列）
- 接続の手順（`server_meta`、`connect`、`token`、`ready`、`disconnect`）
- エンドポイントの登録、呼び出しを受けること、応答
- シグナルの通知

暗号化は実装しない。`remote`の種類のアプリでしか使わないためである。

WebSocketにはIXWebSocket、JSONにはnlohmann/jsonを使う。

### OBSのAPIはUIのスレッドから呼ぶ

通信は専用のスレッドで受ける。OBSのAPIを呼ぶ処理は`obs_queue_task(OBS_TASK_UI, ...)`でUIのスレッドに渡し、結果を通信のスレッドに返す。通信のスレッドからOBSのAPIを直接呼ばない。

### 接続先とトークンは今のファイルから読む

サーバーの`ObsPlugin`は今と同じく`~/.omuapps/obs_config.json`にサーバーのアドレスを、`~/.omuapps/token.json`にプラグインのトークンを書く。C++のプラグインはこの2つを読んで接続する。ファイルの形は変えない。

`obs_config.json`の`launch`（OBSを起動したときにダッシュボードを起動する設定）も今のまま読む。`python_path`は書かない。

### 導入はプラグインのファイルの配置にする

導入は、OBSのシーンの設定にスクリプトを書き込む方式から、プラグインのファイルを配置する方式に変える。

### プラグインはダッシュボードのインストーラーで置く

プラグインのファイルはダッシュボードのインストーラー（TauriのNSIS）が置く。NSISの`NSIS_HOOK_POSTINSTALL`でファイルを置き、`NSIS_HOOK_PREUNINSTALL`で取り除く。Tauriの自動更新もインストーラーを実行するので、プラグインはダッシュボードと同じ版に更新される。サーバーと同じく、版の食い違いを前提にした処理を持たないためである。

置く場所は`%ProgramData%\obs-studio\plugins\omuapps`にする。OBSが入っていなくても置き、あとからOBSを入れたときにそのまま読み込まれるようにする。`%ProgramData%\obs-studio`では利用者にフォルダーを作る権限があり、作ったフォルダーは作った利用者が書き換えられるので、ふつうは管理者の権限が要らない。書き込めなかったときだけ管理者の権限を求める。

インストーラーはOBSが動いているかを確かめ、動いていればOBSを閉じるよう求めてから置く。動いているOBSはプラグインのファイルを開いたままにしていて、上書きできないためである。

`check_installed`はファイルがあるかと版を返す。

### プラグインを外す操作は作らない

ダッシュボードにOBSのプラグインを外す操作を作らない。使いたくない利用者は、OBSのプラグインマネージャー（OBS 32.0から）でプラグインを無効にする。有効かどうかはOBSの設定に残るので、インストーラーが更新のたびにファイルを置き直しても、利用者の選んだ状態は変わらない。

悪い例

```text
ダッシュボードで外す → 外したことをOMUAPPSに記録する → インストーラーが記録を見て置かない
```

良い例

```text
インストーラーは常に置く → 有効かどうかはOBSのプラグインマネージャーが持つ
```

外したという状態をOMUAPPSとOBSの2か所に持つと、食い違ったときにどちらが正しいかを決められないためである。外したあとにOBSの再起動が要るのはどちらの方法でも同じで、利用者の手間は増えない。

ダッシュボードのOBSの設定は、プラグインが入っているかと版を表示するだけにする。`set_install`の`script_active`は使わなくなる。

### サーバーにつながらなくても邪魔をしない

プラグインはOMUAPPSが動いていないときも読み込まれる。つながらないときは、OBSにエラーを出さず、間隔を空けて接続をやり直すだけにする。無効にしなくても困らないようにし、無効にする操作が要る場面を減らすためである。

### 対応するいちばん古いOBSの版でビルドする

OBS 32.0からは、自分より新しい版のOBS向けにビルドしたプラグインを読み込まない。C++のプラグインは、対応するいちばん古いOBSの版の`libobs`でビルドする。

前の版からの移行として、最初の導入のときに次のものを取り除く。

- シーンの設定（`basic/scenes/*.json`）の`scripts-tool`にある`omuapps_plugin.py`
- `user.ini`の`[Python]`の`Path64bit`と`Path32bit`のうち、OMUAPPSが書いた値

### OSで変わる処理は1つの型にまとめる

OBSの設定の場所、プラグインを置く場所、OBSのプロセスの名前はOSで変わる。これらは`ObsInstallation`の型にまとめ、実装を起動したときに1回だけ選ぶ。ほかの処理の中でOSを判定しない。

悪い例

```ts
const dir = process.platform === 'win32'
    ? path.join(process.env.APPDATA!, 'obs-studio')
    : path.join(os.homedir(), '.config/obs-studio');
```

良い例

```ts
const dir = obs.configDirectory;
```

OSを足すときに、`ObsInstallation`の実装を1つ足すだけで済ませるためである。サーバーの実行ファイルとC++のプラグインも、OSごとに作り分けられる構成にしておく（`bun build --compile --target`、CMakeのプリセット）。

## ダッシュボード

### Pythonの準備の処理を消す

Tauriから次のものを消す。

- `python.rs`、`uv.rs`、`sources/py`
- `AppOptions`の`python_version`、`python_path`、`uv_path`
- `open_python_path`、`open_uv_path`のコマンド
- 起動、停止、片付け、アンインストールの進み具合のうちPythonとuvにあたるもの（`StartProgress::Python`、`StartProgress::Uv`など）

進み具合の種類を減らすので、ダッシュボードの画面で進み具合を表示しているところも合わせて直す。

`ServerConfig`（`server.json`）、トークンのファイル、再起動の終了コードの扱いは残す。

### 前の版のサーバーを止めてから起動する

前の版から更新した最初の起動では、Python版のサーバーがまだ動いていることがある。ポートが使われていて、`GET /version`が今の版と違う値を返すときは、そのポートを使っているプロセスを止めてから起動する。止めたあと、アプリのデータのフォルダーにある`python`と`uv`のフォルダーを消す。

## 移行の順序

### 段階と終わりの条件

| 段階 | すること | 終わりの条件 |
|---|---|---|
| 0 | プロトコルの定義を`@omujs/omu`から公開し、食い違いを直す。Python版で保存のデータの見本（識別子のパス、テーブル、レジストリ）を作る | 見本をリポジトリに置いた |
| 1 | TSのサーバーの本体とすべての拡張 | 互換性のテストが両方のサーバーで通る |
| 2 | プラグインの静的な登録と`ObsPlugin` | `check_installed`、`set_install`の自動起動の設定、設定とトークンの書き込みが動く |
| 3 | チャットと`iwashi`の移植 | 3つの配信サイトでチャットを受け取れる。URLからチャンネルの一覧を作れる。移したテストが通る |
| 4 | C++のOBSプラグインとインストーラーでの配置 | `types.ts`のすべてのエンドポイントとシグナルが動く。`%ProgramData%\obs-studio\plugins`に置いたプラグインをOBSが読み込む |
| 5 | ダッシュボードの切り替え | Pythonなしで新しく入れても、前の版から更新しても動く |
| 6 | Pythonの削除 | `packages-py`とPythonの設定とCIのジョブがない |

段階4は段階0のあとならいつ始めてもよい。段階5は1から4がすべて終わるまで始めない。段階5で出す版からPythonの実行環境がなくなり、チャットとOBSのPythonスクリプトが動かなくなるためである。

### 互換性のテストは両方のサーバーに流す

段階1では、同じ場面のテストをPython版とTS版の両方のサーバーに対して流す。テストは`@omujs/omu`のクライアントで書き、サーバーの実装を知らない。Python版を消すまで、Python版との違いをこのテストで見つける。

保存のデータの見本は、TS版がPython版の作ったファイルを読めること、TS版が書いたファイルの名前と中身がPython版と同じことの両方を確かめる。

### PyPIの公開を止める

段階6でPyPIへの公開を止め、既存のパッケージには使わなくなったことを記す。

## 決めていないこと

| 項目 | 決めること |
|---|---|
| 対応するいちばん古いOBSの版 | どの版までのOBSで動かすか。プラグインマネージャーのない32.0より前の版で、利用者がプラグインを無効にする方法をどうするかも合わせて決める |
| 署名 | ダッシュボードのインストーラー、サーバー、OBSのプラグインに署名するか。今はどれにも署名していない。後回しにする |
