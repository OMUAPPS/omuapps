import { type Content, Models } from '@omujs/chat';
import type { Identifier } from '@omujs/omu';

import type { JsonPath } from './youtube-page.js';
import { YoutubeRuns } from './youtube-runs.js';

export type ParsedItem = {
    message: Models.Message;
    author: Models.Author;
};

type Renderer = (data: JsonPath) => ParsedItem | undefined;

export interface AuthorNames {
    knownName(id: Identifier): string | undefined;
}

export class YoutubeRoles {
    public static readonly MODERATOR: Models.Role = new Models.Role({ id: 'moderator', name: 'Moderator', isOwner: false, isModerator: true });
    public static readonly OWNER: Models.Role = new Models.Role({ id: 'owner', name: 'Owner', isOwner: true, isModerator: true });
    public static readonly VERIFIED: Models.Role = new Models.Role({ id: 'verified', name: 'Verified', isOwner: false, isModerator: false });
    public static readonly ICONS: Record<string, Models.Role> = {
        MODERATOR: YoutubeRoles.MODERATOR,
        OWNER: YoutubeRoles.OWNER,
        VERIFIED: YoutubeRoles.VERIFIED,
    };
}

export class YoutubeMessageParser {
    private readonly renderers: Record<string, Renderer>;

    public constructor(
        private readonly providerId: Identifier,
        private readonly roomId: Identifier,
        private readonly names: AuthorNames,
    ) {
        this.renderers = {
            liveChatTextMessageRenderer: (data) => this.item(data, this.author(data), YoutubeRuns.parse(data.get('message'))),
            liveChatPaidMessageRenderer: (data) => this.item(
                data,
                this.author(data),
                data.get('message').has() ? YoutubeRuns.parse(data.get('message')) : undefined,
                { paid: YoutubeMessageParser.paid(data) },
            ),
            liveChatMembershipItemRenderer: (data) => this.item(data, this.author(data), YoutubeMessageParser.system(data.get('headerSubtext'))),
            liveChatSponsorshipsGiftRedemptionAnnouncementRenderer: (data) => this.item(data, this.author(data), YoutubeMessageParser.system(data.get('message'))),
            liveChatSponsorshipsGiftPurchaseAnnouncementRenderer: (data) => this.giftPurchase(data),
            liveChatPlaceholderItemRenderer: () => undefined,
            liveChatPaidStickerRenderer: (data) => this.paidSticker(data),
        };
    }

    public parse(item: JsonPath): ParsedItem | undefined {
        const object = item.object() ?? {};
        for (const type of Object.keys(object)) {
            const renderer = this.renderers[type];
            if (renderer) return renderer(item.get(type));
        }
        throw new Error(`Unknown message type: ${Object.keys(object).join(', ')}`);
    }

    public author(data: JsonPath, fallbackId?: string): Models.Author {
        const id = data.get('authorExternalChannelId').string() ?? fallbackId;
        if (!id) throw new Error('Could not find author id');
        const roles: Models.Role[] = [];
        for (const badge of data.get('authorBadges').list()) {
            const renderer = badge.get('liveChatAuthorBadgeRenderer');
            const iconType = renderer.get('icon', 'iconType').string();
            if (iconType) {
                const role = YoutubeRoles.ICONS[iconType];
                if (!role) throw new Error(`Unknown badge type: ${iconType}`);
                roles.push(role);
                continue;
            }
            const icon = renderer.get('customThumbnail', 'thumbnails', 0, 'url').string();
            if (icon) {
                roles.push(new Models.Role({
                    id: icon,
                    name: renderer.get('tooltip').string() ?? '',
                    iconUrl: icon,
                    isOwner: false,
                    isModerator: false,
                }));
            }
        }
        const authorId = this.roomId.join(id);
        return new Models.Author({
            providerId: this.providerId,
            id: authorId,
            name: this.names.knownName(authorId),
            avatarUrl: data.get('authorPhoto', 'thumbnails', 0, 'url').string(),
            roles,
            metadata: { screen_id: data.get('authorName', 'simpleText').string() },
        });
    }

    private item(
        data: JsonPath,
        author: Models.Author,
        content: Content.Component | undefined,
        extra: { paid?: Models.Paid; gifts?: Models.Gift[] } = {},
    ): ParsedItem {
        const message = new Models.Message({
            id: this.roomId.join(data.get('id').string() ?? ''),
            roomId: this.roomId,
            authorId: author.id,
            content,
            paid: extra.paid,
            gifts: extra.gifts ?? [],
            deleted: false,
            createdAt: new Date(Number(data.get('timestampUsec').string() ?? data.get('timestampUsec').value) / 1000),
        });
        return { message, author };
    }

    private giftPurchase(data: JsonPath): ParsedItem {
        const header = data.get('header', 'liveChatSponsorshipsHeaderRenderer');
        const author = this.author(header, data.get('authorExternalChannelId').string());
        const image = header.get('image');
        const gift = new Models.Gift({
            id: 'liveChatSponsorshipsGiftPurchaseAnnouncement',
            name: YoutubeRuns.accessibilityLabel(image.get('accessibility')),
            amount: 1,
            isPaid: true,
            imageUrl: YoutubeRuns.bestThumbnail(image.get('thumbnails')),
        });
        return this.item(data, author, YoutubeMessageParser.system(header.get('primaryText')), { gifts: [gift] });
    }

    private paidSticker(data: JsonPath): ParsedItem {
        const sticker = data.get('sticker');
        const gift = new Models.Gift({
            id: 'liveChatPaidSticker',
            name: YoutubeRuns.accessibilityLabel(sticker.get('accessibility')),
            amount: 1,
            isPaid: true,
            imageUrl: YoutubeRuns.bestThumbnail(sticker.get('thumbnails')),
        });
        return this.item(data, this.author(data), undefined, { gifts: [gift] });
    }

    private static system(runs: JsonPath): Content.System {
        return { type: 'system', data: [YoutubeRuns.parse(runs)] };
    }

    private static paid(data: JsonPath): Models.Paid {
        const text = data.get('purchaseAmountText', 'simpleText').string() ?? '';
        const currency = /[^0-9]+/.exec(text)?.[0];
        if (!currency) throw new Error(`Could not parse currency: ${text}`);
        const amount = /[\d,.]+/.exec(text)?.[0];
        if (!amount) throw new Error(`Could not parse amount: ${text}`);
        return new Models.Paid(Number.parseFloat(amount.replaceAll(',', '')), currency);
    }
}

