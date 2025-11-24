<script lang="ts">
    import { Content } from '@omujs/chat/models';

    export let component: Content.Component;

    function add(child: Content.Component) {
        const children = Content.children(component);
        children.push(child);
        component = component;
    }

    type ComponentType = 'text' | 'image';

    function create(type: ComponentType) {
        if (type === 'text') {
            add({ type: 'text', data: '' });
        } else if (type === 'image') {
            add({ type: 'image', data: { id: '', url: '', name: '' } });
        } else {
            throw new Error(`Unknown type: ${type}`);
        }
    }

    let select: HTMLSelectElement;

    function handle(event: Event) {
        const target = event.target as HTMLSelectElement;
        const value = target.value as ComponentType;
        create(value);
        target.selectedIndex = 0;
    }
</script>

<span>
    <select bind:this={select} on:change={(event) => handle(event)}>
        <option disabled selected>追加</option>
        <option value="text" on:change={() => create('text')}>テキスト</option>
        <option value="image" on:change={() => create('image')}>画像</option>
    </select>
</span>

<style>
    span {
        display: block;
        margin-left: 5px;
    }

    select {
        width: 100%;
        height: 28px;
        padding: 5px;
        border: 1px solid var(--color-1);
    }
</style>
