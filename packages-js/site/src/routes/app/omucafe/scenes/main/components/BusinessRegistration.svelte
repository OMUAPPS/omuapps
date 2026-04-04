<script lang="ts">
    import { Game } from '../../../core/game';

    const { states } = Game.getInstance();
    const config = states.shop.store;

    const date = new Date();
</script>

<div class="application">
    <h1>個人事業の開業・廃業届出書</h1>
    <table>
        <tbody>
            <tr>
                <th>屋号</th>
                <td>
                    <input type="text" bind:value={$config.shop.name}>
                </td>
            </tr>
            <tr>
                <th>バーチャル住所他・事業所等</th>
                <td>
                    <input type="text" bind:value={$config.shop.address}>
                </td>
            </tr>
            <tr>
                <th>事業者偽名</th>
                <td>
                    <input type="text" bind:value={$config.shop.owner}>
                </td>
            </tr>
        </tbody>
        <tfoot>
        </tfoot>
    </table>

    <table style="font-size: 10px; opacity: 0.621">
        <tbody>
            <tr>
                <th>事務所事業所の</th>
                <td>新設</td>
            </tr>
            <tr>
                <th>開業や廃業のあった日</th>
                <td>
                    <strong>{date.getFullYear()}</strong>
                    <small>年</small>
                    <strong>{date.getMonth()}</strong>
                    <small>月</small>
                    <strong>{date.getDate()}</strong>
                    <small>日</small>
                </td>
            </tr>
        </tbody>
        <tfoot>
        </tfoot>
    </table>

    <div class="date">
        <strong>{date.getFullYear()}</strong>
        <small>年</small>
        <strong>{date.getMonth()}</strong>
        <small>月</small>
        <strong>{date.getDate()}</strong>
        <small>日</small>
    </div>
</div>

<style lang="scss">
    .application {
        width: 26rem;
        height: 30rem;
        padding: 1rem;
        background: var(--color-bg-2);
        font-family: Cambria, Cochin, Georgia, Times, 'Times New Roman', serif;
        font-size: 16px;
        color: #666;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    h1 {
        font-size: 14px;
        margin-bottom: 2rem;
    }

    table {
        border-collapse: collapse;
        border: 1px solid currentColor;
        font-size: 1em;
        letter-spacing: 1px;
    }

    caption {
        caption-side: bottom;
        padding: 10px;
        font-weight: bold;
    }

    thead,
    tfoot {
        background-color: rgb(228 240 245);
    }

    th,
    td {
        border: 1px solid rgb(160 160 160);
        padding: 8px 10px;
    }

    td:last-of-type {
        text-align: center;
    }

    tfoot th {
        text-align: right;
    }

    input {
        background: none;
        border: none;
        border-bottom: 1px solid currentColor;
        width: 100%;
        height: 100%;

        &:focus {
            outline: none;
        }
    }

    .date {
        margin-bottom: 1rem;
        margin-top: auto;
        align-self: flex-end;
    }

    .date strong {
        border-bottom: 1px solid currentColor;
        padding: 0 0.5rem;
    }
</style>
