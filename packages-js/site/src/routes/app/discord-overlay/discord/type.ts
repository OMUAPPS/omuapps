
export type Scope =
    | 'identify'
    | 'email'
    | 'connections'
    | 'guilds'
    | 'guilds.join'
    | 'guilds.members.read'
    | 'guilds.channels.read'
    | 'gdm.join'
    | 'bot'
    | 'rpc'
    | 'rpc.notifications.read'
    | 'rpc.voice.read'
    | 'rpc.voice.write'
    | 'rpc.video.read'
    | 'rpc.video.write'
    | 'rpc.screenshare.read'
    | 'rpc.screenshare.write'
    | 'rpc.activities.write'
    | 'webhook.incoming'
    | 'messages.read'
    | 'applications.builds.upload'
    | 'applications.builds.read'
    | 'applications.commands'
    | 'applications.store.update'
    | 'applications.entitlements'
    | 'activities.read'
    | 'activities.write'
    | 'relationships.read'
    | 'relationships.write'
    | 'voice'
    | 'dm_channels.read'
    | 'role_connections.write'
    | 'presences.read'
    | 'presences.write'
    | 'openid'
    | 'dm_channels.messages.read'
    | 'dm_channels.messages.write'
    | 'gateway.connect'
    | 'account.global_name.update'
    | 'payment_sources.country_code'
    | 'sdk.social_layer'
    | 'applications.commands.permissions.update';

export interface RPCServerConfiguration {
    cdn_host: string;
    api_endpoint: string;
    environment: string;
};

export type snowflake = string;

export type integer = number;

export interface AvatarDecorationData {
    asset: string;
    sku_id: snowflake;
};

export interface Collectibles {
    nameplate?: string;
};

export interface UserPrimaryGuild {
    identity_guild_id?:	snowflake;
    identity_enabled?:	boolean;
    tag?:	string;
    badge?:	string;
};

export interface User {
    id: snowflake;
    username: string;
    discriminator: string;
    global_name?: string;
    avatar?: string;
    bot?: boolean;
    system?: boolean;
    mfa_enabled?: boolean;
    banner?: string;
    accent_color?: integer;
    locale?: string;
    verified?: boolean;
    email?: string;
    flags?: integer;
    premium_interface?: integer;
    public_flags?: integer;
    avatar_decoration_data?: AvatarDecorationData;
    collectibles?: Collectibles;
    primary_guild?: UserPrimaryGuild;
};

export interface RoleColors {
    primary_color: integer;
    secondary_color?: integer;
    tertiary_color?: integer;
};

export interface RoleTags {
    bot_id?: snowflake;
    integration_id?: snowflake;
    premium_subscriber?: null;
    subscription_listing_id?: snowflake;
    available_for_purchase?: null;
    guild_connections?: null;
};

export interface Role {
    id: snowflake;
    name: string;
    color: integer;
    colors: RoleColors;
    hoist: boolean;
    icon?: string;
    unicode_emoji?: string;
    position: integer;
    permissions: string;
    managed: boolean;
    mentionable: boolean;
    tags?: RoleTags;
    flags: integer;
};

export interface Emoji {
    id?:	snowflake;
    name?:	string;
    roles?:	Role[];
    user?:	User;
    require_colons?:	boolean;
    managed?:	boolean;
    animated?:	boolean;
    available?:	boolean;
};

export type GuildFeatures =
    | 'ANIMATED_BANNER'
| 'ANIMATED_ICON'
| 'APPLICATION_COMMAND_PERMISSIONS_V2'
| 'AUTO_MODERATION'
| 'BANNER'
| 'COMMUNITY'
| 'CREATOR_MONETIZABLE_PROVISIONAL'
| 'CREATOR_STORE_PAGE'
| 'DEVELOPER_SUPPORT_SERVER'
| 'DISCOVERABLE'
| 'FEATURABLE'
| 'INVITES_DISABLED'
| 'INVITE_SPLASH'
| 'MEMBER_VERIFICATION_GATE_ENABLED'
| 'MORE_SOUNDBOARD'
| 'MORE_STICKERS'
| 'NEWS'
| 'PARTNERED'
| 'PREVIEW_ENABLED'
| 'RAID_ALERTS_DISABLED'
| 'ROLE_ICONS'
| 'ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE'
| 'ROLE_SUBSCRIPTIONS_ENABLED'
| 'SOUNDBOARD'
| 'TICKETED_EVENTS_ENABLED'
| 'VANITY_URL'
| 'VERIFIED'
| 'VIP_REGIONS'
| 'WELCOME_SCREEN_ENABLED'
| 'GUESTS_ENABLED'
| 'GUILD_TAGS'
| 'ENHANCED_ROLE_COLORS';

export interface WelcomeScreenChannel {
    channel_id: snowflake;
    description: string;
    emoji_id?: snowflake;
    emoji_name?: string;
};

export interface WelcomeScreen {
    description?: string;
    welcome_channels: WelcomeScreenChannel[];
};

export type int = number;

export type ISO8601 = string;

export interface Sticker {
    id: snowflake;
    pack_id?: snowflake;
    name: string;
    description: string;
    tags: string;
    interface: integer;
    format_interface: integer;
    available?: boolean;
    guild_id?: snowflake;
    user?: User;
    sort_value?: integer;
};

export interface IncidentsData {
    invites_disabled_until?: ISO8601;
    dms_disabled_until?: ISO8601;
    dm_spam_detected_at?: ISO8601;
    raid_detected_at?: ISO8601;
};

export interface Guild {
    id: snowflake;
    name: string;
    icon?: string;
    icon_url?: string | null;
    icon_hash?: string;
    splash?: string;
    discovery_splash?: string;
    owner?: boolean;
    owner_id: snowflake;
    permissions?: string;
    region?: string;
    afk_channel_id?: snowflake;
    afk_timeout: integer;
    widget_enabled?: boolean;
    widget_channel_id?: snowflake;
    verification_level: integer;
    default_message_notifications?: integer;
    explicit_content_filter: integer;
    roles: Role[];
    emojis: Emoji[];
    features: GuildFeatures[];
    mfa_level: integer;
    application_id?: snowflake;
    system_channel_id?: snowflake;
    system_channel_flags: integer;
    rules_channel_id?: snowflake;
    max_presences?: integer;
    max_members?: integer;
    vanity_url_code?: string;
    description?: string;
    banner?: string;
    premium_tier: integer;
    premium_subscription_count?: integer;
    preferred_locale: string;
    public_updates_channel_id?: snowflake;
    max_video_channel_users?: integer;
    max_stage_video_channel_users?: integer;
    approximate_member_count?: integer;
    approximate_presence_count?: integer;
    welcome_screen?: WelcomeScreen;
    nsfw_level: integer;
    stickers?: Sticker[];
    premium_progress_bar_enabled: boolean;
    safety_alerts_channel_id?: snowflake;
    incidents_data?: IncidentsData;
};

export interface ChannelMention {
    id: snowflake;
    guild_id: snowflake;
    type: integer;
    name: string;
}

export type float = number;

export interface Attachment {
    id: snowflake;
    filename: string;
    title?: string;
    description?: string;
    content_type?: string;
    size: integer;
    url: string;
    proxy_url: string;
    height?: integer;
    width?: integer;
    ephemeral?: boolean;
    duration_secs?: float;
    waveform?: string;
    flags?: integer;
}

export interface EmbedFooter {
    text: string;
    icon_url?: string;
    proxy_icon_url?: string;
}

export interface EmbedImage {
    url: string;
    proxy_url?: string;
    height?: integer;
    width?: integer;
}

export interface EmbedThumbnail {
    url: string;
    proxy_url?: string;
    height?: integer;
    width?: integer;
}

export interface EmbedVideo {
    url?: string;
    proxy_url?: string;
    height?: integer;
    width?: integer;
}

export interface EmbedProvider {
    name?: string;
    url?: string;
}

export interface EmbedAuthor {
    name: string;
    url?: string;
    icon_url?: string;
    proxy_icon_url?: string;
}

export interface EmbedField {
    name: string;
    value: string;
    inline?: boolean;
}

export interface Embed {
    title?: string;
    type?: string;
    description?: string;
    url?: string;
    timestamp?: ISO8601;
    color?: integer;
    footer?: EmbedFooter;
    image?: EmbedImage;
    thumbnail?: EmbedThumbnail;
    video?: EmbedVideo;
    provider?: EmbedProvider;
    author?: EmbedAuthor;
    fields?: EmbedField[];
}

export interface Reaction {
    count: integer;
    count_details: object;
    me: boolean;
    me_burst: boolean;
    emoji: Emoji;
    burst_colors: string[];
}

export interface MessageActivity {
    type: integer;
    party_id?: string;
}

export interface TeamMember {
    membership_state: integer;
    team_id: snowflake;
    user: User;
    role: string;
}

export interface Team {
    icon?: string;
    id: snowflake;
    members: TeamMember;
    name: string;
    owner_user_id: snowflake;
}

export type ApplicationEventWebhookStatus =
    | 1 // Webhook events are disabled by developer
    | 2 // Webhook events are enabled by developer
    | 3; // Webhook events are disabled by Discord, usually due to inactivity

export interface InstallParams {
    scopes: string[];
    permissions: string;
}

export enum ApplicationIntegrationTypes {
    GUILD_INSTALL = 0, // App is installable to servers
    USER_INSTALL = 1, //  App is installable to users
}

export interface Application {
    id: snowflake;
    name: string;
    icon: string;
    description: string;
    rpc_origins?: string[];
    bot_public: boolean;
    bot_require_code_grant: boolean;
    bot?: User;
    terms_of_service_url?: string;
    privacy_policy_url?: string;
    owner?: User;
    verify_key: string;
    team: Team;
    guild_id?: snowflake;
    guild?: Guild;
    primary_sku_id?: snowflake;
    slug?: string;
    cover_image?: string;
    flags?: integer;
    approximate_guild_count?: integer;
    approximate_user_install_count?: integer;
    approximate_user_authorization_count?: integer;
    redirect_uris?: string[];
    interactions_endpoint_url?: string;
    role_connections_verification_url?: string;
    event_webhooks_url?: string;
    event_webhooks_status: ApplicationEventWebhookStatus;
    event_webhooks_types?: string[];
    tags?: string[];
    install_params?: InstallParams;
    integration_types_config?: Record<string, ApplicationIntegrationTypes>;
    custom_install_url?: string;
}

export interface MessageReference {
    type?: integer;
    message_id?: snowflake;
    channel_id?: snowflake;
    guild_id?: snowflake;
    fail_if_not_exists?: boolean;
}

export interface MessageSnapshot {
    message: Message;
}

export enum InteractionType {
    PING = 1,
    APPLICATION_COMMAND = 2,
    MESSAGE_COMPONENT = 3,
    APPLICATION_COMMAND_AUTOCOMPLETE = 4,
    MODAL_SUBMIT = 5,
}

export interface MessageInteractionMetadata {
    id: snowflake;
    type: InteractionType;
    user: User;
    authorizing_integration_owners: Record<string, ApplicationIntegrationTypes>;
    original_response_message_id?: snowflake;
    target_user?: User;
    target_message_id?: snowflake;
}

export interface GuildMember {
    user?: User;
    nick?: string;
    avatar?: string;
    banner?: string;
    roles: snowflake[];
    joined_at?: ISO8601;
    premium_since?: ISO8601;
    deaf: boolean;
    mute: boolean;
    flags: integer;
    pending?: boolean;
    permissions?: string;
    communication_disabled_until?: ISO8601;
    avatar_decoration_data?: AvatarDecorationData;
}

export interface MessageInteraction {
    id: snowflake;
    type: InteractionType;
    name: string;
    user: User;
    member?: GuildMember;
}

export interface Overwrite {
    id: snowflake;
    type: int;
    allow: string;
    deny: string;
}

export interface ThreadMetadata {
    auto_archive_duration: integer;
    archive_timestamp: ISO8601;
    locked: boolean;
    invitable?: boolean;
    create_timestamp?: ISO8601;
}

export interface ThraedMember {
    id?: snowflake;
    user_id?: snowflake;
    join_timestamp: ISO8601;
    flags: integer;
    member?: GuildMember;
}

export interface ForumTag {
    id: snowflake;
    name: string;
    moderated: boolean;
    emoji_id?: snowflake;
    emoji_name?: string;
}

export interface DefaultReaction {
    emoji_id?: snowflake;
    emoji_name?: string;
}

export interface Channel {
    id: snowflake;
    guild_id?: snowflake;
    position?: integer;
    permission_overwrites?: Overwrite[];
    name?: string;
    topic?: string;
    nsfw?: boolean;
    last_message_id?: snowflake;
    bitrate?: integer;
    user_limit?: integer;
    rate_limit_per_user?: integer;
    recipients?: User[];
    icon?: string;
    owner_id?: snowflake;
    application_id?: snowflake;
    managed?: boolean;
    parent_id?: snowflake;
    last_pin_timestamp?: ISO8601;
    rtc_region?: string;
    video_quality_mode?: integer;
    message_count?: integer;
    member_count?: integer;
    thread_metadata?: ThreadMetadata;
    member?: ThraedMember;
    default_auto_archive_duration?: integer;
    permissions?: string;
    flags?: integer;
    total_message_sent?: integer;
    available_tags?: ForumTag[];
    applied_tags?: snowflake[];
    default_reaction_emoji?: DefaultReaction;
    default_thread_rate_limit_per_user?: integer;
    default_sort_order?: integer;
    default_forum_layout?: integer;

    //
    type: number;
    voice_states: VoiceState[];
}

export type Component = unknown;

export interface StickerItem {
    id: snowflake;
    name: string;
    format_type: integer;
}

export interface RoleSubscriptionData {
    role_subscription_listing_id: snowflake;
    tier_name: string;
    total_months_subscribed: integer;
    is_renewal: boolean;
}

export interface ResolvedData {
    users?: Record<snowflake, User>;
    members?: Record<snowflake, GuildMember>;
    roles?: Record<snowflake, Role>;
    channels?: Record<snowflake, Channel>;
    messages?: Record<snowflake, Message>;
    attachments?: Record<snowflake, Attachment>;
}

export interface PollMediaObject {
    text?: string;
    emoji?: Emoji;
}

export interface PollMediaObject {
    text?: string;
    emoji?: Emoji;
}

export interface PollAnswerObject {
    answer_id: integer;
    poll_media: PollMediaObject;
}

export interface PollAnswerCountObject {
    id: integer;
    count: integer;
    me_voted: boolean;
}

export interface PollResultsObject {
    is_finalized: boolean;
    answer_counts: PollAnswerCountObject;
}

export interface Poll {
    question: PollMediaObject;
    answers: PollAnswerObject;
    expiry?: ISO8601;
    allow_multiselect: boolean;
    layout_type: integer;
    results?: PollResultsObject;
}

export interface MessageCall {
    participants: snowflake[];
    ended_timestamp?: ISO8601;
}

export interface Message {
    id: snowflake;
    channel_id: snowflake;
    author: User;
    content: string;
    timestamp: ISO8601;
    edited_timestamp?: ISO8601;
    tts: boolean;
    mention_everyone: boolean;
    mentions: User[];
    mention_roles: Role[];
    mention_channels?:	ChannelMention[];
    attachments: Attachment[];
    embeds: Embed[];
    reactions?: Reaction[];
    nonce?: integer | string;
    pinned: boolean;
    webhook_id?: snowflake;
    type: integer;
    activity?: MessageActivity;
    application?: Application;
    application_id?: snowflake;
    flags?: integer;
    message_reference?: MessageReference;
    message_snapshots?: MessageSnapshot[];
    referenced_message?: Message[];
    interaction_metadata?: MessageInteractionMetadata;
    interaction?: MessageInteraction;
    thread?: Channel;
    components?: Component[];
    sticker_items?: StickerItem[];
    stickers?: Sticker[];
    position?: integer;
    role_subscription_data?: RoleSubscriptionData;
    resolved?: ResolvedData;
    poll?: Poll;
    call?: MessageCall;
}

export interface VoiceState {
    guild_id?: snowflake;
    channel_id?: snowflake;
    user_id: snowflake;
    member?: GuildMember;
    session_id: string;
    deaf: boolean;
    mute: boolean;
    self_deaf: boolean;
    self_mute: boolean;
    self_stream?: boolean;
    self_video: boolean;
    suppress: boolean;
    request_to_speak_timestamp?: ISO8601;
}

export interface Pan {
    left: float;
    right: float;
}

export interface ActivityTimestamps {
    start?: integer;
    end?: integer;
}

export interface ActivityParty {
    id?: string;
    size?: [number, number];
}

export interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    large_url?: string;
    small_image?: string;
    small_text?: string;
    small_url?: string;
    invite_cover_image?: string;
}

export interface ActivitySecrets {
    join?: string;
    spectate?: string;
    match?: string;
}

export interface ActivityButtons {
    label: string;
    url: string;
}

export interface Activity {
    name: string;
    type: integer;
    url?: string;
    created_at: integer;
    timestamps?: ActivityTimestamps;
    application_id?: snowflake;
    status_display_type?: integer;
    details?: string;
    details_url?: string;
    state?: string;
    state_url?: string;
    emoji?: Emoji;
    party?: ActivityParty;
    assets?: ActivityAssets;
    secrets?: ActivitySecrets;
    instance?: boolean;
    flags?: integer;
    buttons?: ActivityButtons[];
}

export enum DeviceType {
    AUDIO_INPUT =	'audioinput',
    AUDIO_OUTPUT =	'audiooutput',
    VIDEO_INPUT =	'videoinput',
}
export interface Vendor {
    name: string;
    url: string;
}
export interface Model {
    name: string;
    url: string;
}
export interface Device {
    type: DeviceType;
    id: string;
    vendor: Vendor;
    model: Model;
    related: string[];
    echo_cancellation: boolean;
    noise_suppression: boolean;
    automatic_gain_control: boolean;
    hardware_mute: boolean;
}

export interface VoiceSettingsInput {
    device_id: string;
    volume: float;
    available_devices: {
        id: string;
        name: string;
    }[];
}
export interface VoiceSettingsOutput {
    device_id: string;
    volume: float;
    available_devices: {
        id: string;
        name: string;
    }[];
}

export enum KeyTypes {
    KEYBOARD_KEY = 0,
    MOUSE_BUTTON = 1,
    KEYBOARD_MODIFIER_KEY = 2,
    GAMEPAD_BUTTON = 3,
}

export interface ShortcutKeyCombo {
    type: KeyTypes;
    code: integer;
    name: string;
}

export interface VoiceSettingsMode {
    type: string;
    auto_threshold: boolean;
    threshold: float;
    shortcut: ShortcutKeyCombo;
    delay: float;
}

export type VoiceStateItem = {
    voice_state: VoiceState;
    user: User;
    nick: string;
    volume: number;
    mute: boolean;
    pan: Pan;
};
