<script lang="ts">
    const { webview } = window as unknown as {
        webview: {
            startResizing: (orientation: string) => void;
        };
    };
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="resize"
    onmousedown={() => {
        webview.startResizing('East');
    }}
    style="position: absolute; top: 0; right: 0; width: 0.5rem; height: 100%; cursor: ew-resize;"
></div>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="resize"
    onmousedown={() => {
        webview.startResizing('South');
    }}
    style="position: absolute; bottom: 0; left: 0; width: 100%; height: 0.5rem; cursor: ns-resize;"
></div>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="resize"
    onmousedown={() => {
        webview.startResizing('SouthEast');
    }}
    style="position: absolute; bottom: 0; right: 0; width: 0.5rem; height: 0.5rem; cursor: nwse-resize;"
></div>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="resize"
    onmousedown={() => {
        webview.startResizing('North');
    }}
    style="position: absolute; top: 0; left: 0; width: 100%; height: 0.5rem; cursor: ns-resize;"
></div>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="resize"
    onmousedown={() => {
        webview.startResizing('West');
    }}
    style="position: absolute; top: 0; left: 0; width: 0.5rem; height: 100%; cursor: ew-resize;"
></div>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="resize"
    onmousedown={() => {
        webview.startResizing('NorthWest');
    }}
    style="position: absolute; top: 0; left: 0; width: 0.5rem; height: 0.5rem; cursor: nwse-resize;"
></div>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="resize"
    onmousedown={() => {
        webview.startResizing('NorthEast');
    }}
    style="position: absolute; top: 0; right: 0; width: 0.5rem; height: 0.5rem; cursor: nesw-resize;"
></div>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="resize"
    onmousedown={() => {
        webview.startResizing('SouthWest');
    }}
    style="position: absolute; bottom: 0; left: 0; width: 0.5rem; height: 0.5rem; cursor: nesw-resize;"
></div>
