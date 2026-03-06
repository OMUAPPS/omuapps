<script lang="ts">
    import type { Models } from '@omujs/chat';
    import { chat, ComponentRenderer, Tooltip } from '@omujs/ui';

    interface Props {
        entry: Models.Message;
    }

    let { entry }: Props = $props();

    let author: Models.Author | undefined = $state();

    async function load() {
        if (entry.authorId) {
            author = await $chat.authors.get(entry.authorId.key());
        }
    }

    load();
</script>

<div class="entry">
    <div class="left">
        {#if author?.avatarUrl}
            <span class="avatar">
                <a href={author.metadata.url} title={author.metadata.screen_id} target="_blank" rel="noopener noreferrer">
                    <Tooltip>
                        {author.metadata.url}
                    </Tooltip>
                    <img src={author.avatarUrl} alt="">
                </a>
            </span>
        {/if}
    </div>
    <div class="body">
        {#if author}
            <span class="name">
                {author.name}
            </span>
        {/if}
        {#if entry.content}
            <span class="content">
                <ComponentRenderer component={entry.content} />
            </span>
        {/if}
    </div>
</div>

<style lang="scss">
    .entry {
        margin: 0.75rem 1rem;
        font-size: 0.85rem;
        display: flex;
    }

    a {
        color: #fff;
    }

    .name {
        font-weight: bold;
        margin-right: 0.5rem;
        opacity: 0.7;
        font-size: 0.7rem;
        font-weight: 500;
        vertical-align: text-top;
    }

    .content {
        white-space: pre-wrap;
        user-select: text;
    }

    .avatar {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 9999px;
        overflow: hidden;
        display: inline-block;
        margin-right: 0.5rem;
        vertical-align: baseline;
        object-fit: contain;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 2rem;
        }
    }
</style>
