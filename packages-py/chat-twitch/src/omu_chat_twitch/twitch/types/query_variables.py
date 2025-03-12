from __future__ import annotations

from typing import Required, TypedDict

type NotDefined = None
type String = str
type ID = str
type ClipsPeriod = NotDefined
type Time = NotDefined
type SponsorshipsParams = NotDefined
type Boolean = bool
type PurchasableOfferParams = NotDefined
type OfferTagBindingInput = NotDefined
type Int = int
type PaymentSession = NotDefined
type SubscriptionReferrerData = NotDefined
type MoneyInput = NotDefined
type XsollaMoneyInput = NotDefined
type WalletType = NotDefined
type SponsorshipUserProgressType = NotDefined
type Granularity = NotDefined
type PayoutChannelRevenuesInput = NotDefined
type TimeSeriesPeriod = NotDefined
type CategoryTimeseriesMetricsParams = NotDefined
type UserClipsInput = NotDefined
type Cursor = NotDefined
type ReactionsContentKey = NotDefined
type ReactionsContentType = NotDefined
type BatchStoriesByIdInput = NotDefined
type StorySummaryInput = NotDefined
type CommunityPointsCommunityGoalType = NotDefined
type GuestStarSessionOptions = NotDefined
type PinnedChatMessageType = NotDefined
type UnbanRequestsSortOrder = NotDefined
type UnbanRequestStatus = NotDefined
type UserLookupType = NotDefined
type GuestStarSessionsOptions = NotDefined
type VideoConnectionSearchParams = NotDefined
type InviteLinkType = NotDefined
type SortOrder = NotDefined
type RequestToJoinQueueOptions = NotDefined
type GuestStarChannelCollaborationOptions = NotDefined
type CommunityPointsCustomRewardRedemptionQueueSortOrder = NotDefined
type PlatformType = NotDefined
type StreamOptions = NotDefined
type GameStreamOptions = NotDefined
type WatchPartyItemSearchOptions = NotDefined
type TaxInterviewType = NotDefined
type UserByAttribute = NotDefined
type AdRequestContext = NotDefined
type OnDemandContentType = NotDefined
type OnDemandDimension = NotDefined
type ReferralsDimension = NotDefined
type ReferralsFilter = NotDefined
type SponsorshipTermsQuery = NotDefined
type SponsorshipInstanceQuery = NotDefined
type OnsiteNotificationDisplayType = NotDefined
type BansSharingRequestsSortOrder = NotDefined
type AdInput = NotDefined
type ClientInput = NotDefined
type ChannelDashboardViewType = NotDefined
type PollVoterConnectionSort = NotDefined
type CustomSubBenefitState = NotDefined
type VideoSort = NotDefined
type BroadcastType = NotDefined
type RecommendationsContext = NotDefined
type ShelvesOptions = NotDefined
type ClipReferralsParams = NotDefined
type RaidRecommendationsSource = NotDefined
type UserSponsorshipSettingsInput = NotDefined
type StoryFeatureCapability = NotDefined
type DJCatalogSearchInput = NotDefined
type FeaturedUpcomingStreamsOptions = NotDefined
type GameClipsInput = NotDefined
type BrowsableCollectionStreamsOptions = NotDefined
type SearchForOptions = NotDefined
type ImpressionAnalyticsFilter = NotDefined
type ImpressionAnalyticsDimension = NotDefined
type SubscriptionBenefitFilter = NotDefined
type SubscriptionPlatform = NotDefined
type FreeformTagSort = NotDefined
type EmoteUsageType = NotDefined
type EmoteUsageSort = NotDefined
type EmoteGroupProductType = NotDefined
type EmoteGroupAssetType = NotDefined
type ModActionAuthorType = NotDefined
type ReportableModActionType = NotDefined
type ShelvesAvailableOptions = NotDefined
type TagType = NotDefined
type HourlyViewersInput = NotDefined
type HourlyViewersReportInput = NotDefined
type VideoConnectionOptionsInput = NotDefined
type ShelfGroupID = NotDefined
type FollowedGamesType = NotDefined
type AutoModContentInput = NotDefined
type CreatorHomePlatformType = NotDefined
type VideoStatus = NotDefined
type GameOptions = NotDefined
type ScheduleSegmentDay = NotDefined
type SearchCharitiesParams = NotDefined
type Token = NotDefined
type SearchForTarget = NotDefined
type BitsTransactionConnectionInput = NotDefined
type PaymentTransactionConnectionCriteriaInput = NotDefined


class RoleRestrictedVariables(TypedDict, total=False):
    contentOwnerLogin: Required[String]


class ClipsDownloadButtonVariables(TypedDict, total=False):
    slug: Required[ID]


class VideoShareBox_CollectionTrackingMetaVariables(TypedDict, total=False):
    creatorID: Required[ID]


class VideoShareBox_TrackingVideoContextVariables(TypedDict, total=False):
    videoID: Required[ID]


class DevCommonUtils_FetchGamesVariables(TypedDict, total=False):
    orgId: Required[ID]


class TopGameClipsVariables(TypedDict, total=False):
    name: Required[String]
    clipPeriod: Required[ClipsPeriod]
    startAt: Time
    endAt: Time


class QuickActionsFollowerOnlyChatQueryVariables(TypedDict, total=False):
    login: Required[String]


class ChannelSkinsVariables(TypedDict, total=False):
    channelLogin: String
    sponsorshipsParams: SponsorshipsParams


class RocketBoostOpportunityPurchasableUnitsVariables(TypedDict, total=False):
    channelID: Required[ID]


class SyncedSettingsEmoteAnimationsVariables(TypedDict, total=False): ...


class RedemptionStatusInCheckoutVariables(TypedDict, total=False):
    id: Required[ID]


class GiftCardRedemptionInCheckoutValidation_GetKeyStatusVariables(TypedDict, total=False):
    code: Required[String]


class CheckoutFormReviewScreenVariables(TypedDict, total=False):
    purchaseOrderID: Required[ID]
    includeOrder: Required[Boolean]


class getUserLoginInfoVariables(TypedDict, total=False):
    id: Required[ID]


class TwoFactorReminderVariables(TypedDict, total=False): ...


class CheckoutFormScreenManagerVariables(TypedDict, total=False):
    params: Required[PurchasableOfferParams]
    tagBindings: list[Required[OfferTagBindingInput]]
    giftRecipientIDs: list[Required[ID]]
    quantity: Required[Int]
    paymentSession: Required[PaymentSession]
    withDiscounts: Boolean
    isDarkMode: Boolean
    referrerData: SubscriptionReferrerData
    inputAmount: MoneyInput
    xsollaInputAmount: XsollaMoneyInput
    benefitsStartTime: Time


class UserBalanceQueryVariables(TypedDict, total=False):
    walletType: Required[WalletType]


class CheckoutFormSelectScreen_PaymentMethodInsertStatusVariables(TypedDict, total=False):
    workflowID: Required[ID]


class BitsBundleSuccessScreenVariables(TypedDict, total=False): ...


class BoostSuccessScreenVariables(TypedDict, total=False):
    id: Required[ID]


class ChannelSubGiftSuccessScreenVariables(TypedDict, total=False):
    productName: Required[String]
    giftRecipientID: ID


class ChannelSubSuccessScreenVariables(TypedDict, total=False):
    productName: Required[String]


class CheckoutFormSuccessScreenVariables(TypedDict, total=False):
    params: Required[PurchasableOfferParams]


class CheckoutPaymentsDisclaimerVariables(TypedDict, total=False): ...


class KRExtraLegalDisclaimerVariables(TypedDict, total=False): ...


class LegalDisclaimerVariables(TypedDict, total=False): ...


class CompletePurchaseDisclaimerVariables(TypedDict, total=False):
    params: Required[PurchasableOfferParams]


class ConfirmCountryOfResidenceVariables(TypedDict, total=False): ...


class BitsProductDescriptionVariables(TypedDict, total=False): ...


class RocketBoostProductDescriptionVariables(TypedDict, total=False):
    id: Required[ID]


class SubsProductDescriptionVariables(TypedDict, total=False):
    productName: Required[String]
    giftRecipientID: ID
    includeGiftRecipientQuery: Required[Boolean]
    params: Required[PurchasableOfferParams]


class TurboProductDescriptionVariables(TypedDict, total=False):
    name: Required[String]


class ProductDescriptionVariables(TypedDict, total=False):
    channelID: ID
    params: Required[PurchasableOfferParams]


class SubsCheckoutContainerVariables(TypedDict, total=False):
    recipientLogin: Required[String]
    productName: Required[String]
    includeRecipientQuery: Required[Boolean]


class SubtemberCalloutQueryVariables(TypedDict, total=False):
    id: Required[ID]


class ChannelPage_SubscribeButton_UserVariables(TypedDict, total=False):
    login: Required[String]
    includeExpiredDunning: Boolean


class Sub_AnalyticsVariables(TypedDict, total=False):
    channelID: Required[ID]


class SubsidizedSubscriptionsVariables(TypedDict, total=False):
    channelID: ID
    channelLogin: String
    progressType: Required[SponsorshipUserProgressType]
    shouldFetchUserProgress: Required[Boolean]
    sponsorshipsParams: SponsorshipsParams


class AchievementsPageVariables(TypedDict, total=False):
    channelID: Required[ID]


class UseQuestsHookVariables(TypedDict, total=False):
    channelID: Required[ID]


class ChannelAnalyticsAdBreaksTimeseriesStatsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timeZone: Required[String]


class ChannelAnalyticsAdTimePerHourTimeseriesStatsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timeZone: Required[String]


class ChannelAnalyticsAverageViewersTimeseriesStatsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timeZone: Required[String]


class ChannelAnalyticsChatMessagesTimeseriesStatsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timeZone: Required[String]


class ChannelAnalyticsChattersTimeseriesStatsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timeZone: Required[String]


class ChannelAnalyticsClipViewsTimeseriesStatsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timeZone: Required[String]


class ChannelAnalyticsClipsCreatedTimeseriesStatsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timeZone: Required[String]


class ChannelAnalyticsFollowsTimeseriesStatsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timeZone: Required[String]


class ChannelAnalyticsHostAndRaidViewersTimeseriesStatsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timeZone: Required[String]


class ChannelAnalyticsLiveViewsTimeseriesStatsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timeZone: Required[String]


class ChannelAnalyticsMaxViewersTimeseriesStatsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timeZone: Required[String]


class ChannelAnalyticsMinutesWatchedTimeseriesStatsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timeZone: Required[String]


class ChannelAnalytics_NotificationsTimeseriesVariables(TypedDict, total=False):
    channelName: Required[String]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    numberOfIntervals: Required[Int]
    timeZone: Required[String]


class ChannelAnalyticsPromotionClickTimeseriesStatsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timeZone: Required[String]


class ChannelAnalyticsPromotionDisplayTimeseriesStatsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timeZone: Required[String]


class ChannelAnalyticsTimeStreamedTimeseriesStatsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timeZone: Required[String]


class ChannelAnalyticsUniqueViewersTimeseriesStatsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timeZone: Required[String]


class ChannelAnalyticsCSVExporterVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Granularity
    timeZone: Required[String]


class ChannelAnalytics_NotificationsEngagementsVariables(TypedDict, total=False):
    channelName: Required[String]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    numberOfIntervals: Required[Int]
    timeZone: Required[String]


class ChannelAnalyticsCreatorMetricsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    numberOfIntervals: Required[Int]


class PayoutChannelRevenuesVariables(TypedDict, total=False):
    input: Required[PayoutChannelRevenuesInput]


class PayoutsSubCountsVariables(TypedDict, total=False):
    startAt: Required[Time]
    endAt: Required[Time]
    period: Required[TimeSeriesPeriod]
    channel: Required[String]


class Channel_Analytics_RevenueVariables(TypedDict, total=False):
    startAt: Required[Time]
    endAt: Required[Time]
    timeZone: Required[String]
    granularity: Granularity
    channelID: Required[ID]


class DashboardInsights_ChannelVariables(TypedDict, total=False):
    channelLogin: Required[String]


class NewVsReturning_TimeSeriesVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    timeZone: Required[String]
    granularity: Granularity


class CategoryRankingQueryVariables(TypedDict, total=False):
    channelID: Required[ID]
    categoryTag: Required[String]
    languageTag: Required[String]
    timestamp: Time
    experiments: list[Required[String]]


class CategoryReportQueryVariables(TypedDict, total=False):
    channelID: Required[ID]
    languageTag: String
    timestamp: Time
    experiments: list[Required[String]]


class IsPartnerQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class ChannelAnalytics_StreamsPanelVariables(TypedDict, total=False):
    channelLogin: Required[String]
    startAt: Required[Time]
    endAt: Required[Time]


class CategoryTimeseriesMetricsVariables(TypedDict, total=False):
    startAt: Required[Time]
    endAt: Required[Time]
    period: Required[TimeSeriesPeriod]
    params: Required[CategoryTimeseriesMetricsParams]
    channel: String


class Channel_Analytics_Sub_CountsVariables(TypedDict, total=False):
    startAt: Required[Time]
    endAt: Required[Time]
    period: Required[TimeSeriesPeriod]
    channel: Required[String]


class Dashboard_TopClipsVariables(TypedDict, total=False):
    login: Required[String]
    limit: Int
    criteria: UserClipsInput


class InviteOnlyExtensionPageVariables(TypedDict, total=False):
    skipCurrentUser: Required[Boolean]
    afterCursor: Cursor


class StoriesChannelBannerFollowButton_UserVariables(TypedDict, total=False):
    login: Required[String]


class aggregateReactionsBreakdownByContentKeysVariables(TypedDict, total=False):
    contentKeys: Required[list[Required[ReactionsContentKey]]]


class availableReactionsByContentTypeVariables(TypedDict, total=False):
    contentType: Required[ReactionsContentType]


class currentReactionsByContentKeysVariables(TypedDict, total=False):
    contentKeys: Required[list[Required[ReactionsContentKey]]]


class IndividualStoryForViewersVariables(TypedDict, total=False):
    input: list[Required[BatchStoriesByIdInput]]


class StoryChannelQueryVariables(TypedDict, total=False):
    channelLogin: String


class StorySummaryVariables(TypedDict, total=False):
    input: Required[StorySummaryInput]


class WithIsStreamLiveQueryVariables(TypedDict, total=False):
    id: Required[ID]


class CommonHooks_BlockedUsersWithDetailsVariables(TypedDict, total=False): ...


class CommonHooks_BlockedUsersVariables(TypedDict, total=False): ...


class AvailableEmotesForChannelPaginatedVariables(TypedDict, total=False):
    channelID: Required[ID]
    withOwner: Required[Boolean]
    pageLimit: Required[Int]
    cursor: Cursor


class AvailableEmotesForChannelVariables(TypedDict, total=False):
    channelID: Required[ID]
    withOwner: Required[Boolean]


class EmotesForChannelFollowStatusVariables(TypedDict, total=False):
    channelID: Required[ID]


class CommunityOnboardingAllowlistVariables(TypedDict, total=False):
    channelID: Required[ID]


class BlockedUsersVariables(TypedDict, total=False): ...


class UserEmotesVariables(TypedDict, total=False):
    withOwner: Required[Boolean]


class UserModStatusVariables(TypedDict, total=False):
    userID: Required[ID]
    channelID: Required[String]


class Dashboard_CensusGetBirthdateVariables(TypedDict, total=False): ...


class AccessGetFeatureClipRestrictionsQueryVariables(TypedDict, total=False):
    channelLogin: String


class AccessGetUserQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AccessIsAdsPreRollEnabledQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AccessIsAffiliateQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]
    isChannelLoginSameAsUserLogin: Required[Boolean]


class AccessIsBountiesEnabledQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AccessIsChannelEditorQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AccessIsChannelModeratorQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AccessIsChannelPointsAvailableQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AccessIsChannelPointsEnabledQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AccessIsChannelPointsPredictionsEnabledQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AccessIsCommunityMomentsEnabledQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class AccessIsCreatorGiftsAvailableQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class UserDJStatusQueryVariables(TypedDict, total=False):
    login: String


class AccessIsExtensionsDeveloperQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]
    isChannelLoginSameAsUserLogin: Required[Boolean]


class AccessIsGlobalModQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AccessIsPartnerQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]
    isChannelLoginSameAsUserLogin: Required[Boolean]


class PollChannelSettingsVariables(TypedDict, total=False):
    channelID: ID
    channelLogin: String


class AccessIsSiteAdminQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class SponsorshipChannelSettingsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AccessIsStreamDelayEnabledQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AccessIsSubscriptionsEnabledQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AccessMaxAdBreakLengthQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ActivityFilterContextQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class GlobalBadgesVariables(TypedDict, total=False): ...


class BitsConfigContext_ChannelVariables(TypedDict, total=False):
    login: Required[String]


class BitsConfigContext_SharedChatChannelsVariables(TypedDict, total=False):
    ids: list[Required[ID]]


class BitsConfigContext_GlobalVariables(TypedDict, total=False): ...


class BuyBitsCheckoutVariables(TypedDict, total=False): ...


class CommunitySupportSettingsVariables(TypedDict, total=False):
    channelID: Required[ID]


class UseLiveVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AdsSchedulerService_QueryAdPropertiesVariables(TypedDict, total=False):
    login: Required[String]


class ChatScreenReaderAutoAnnounceVariables(TypedDict, total=False): ...


class AutoModSenderVariables(TypedDict, total=False):
    senderID: Required[ID]
    channelID: Required[ID]


class SyncedSettingsCelebrationsVariables(TypedDict, total=False): ...


class ChatFilterContextManager_UserVariables(TypedDict, total=False): ...


class ChatInputVariables(TypedDict, total=False):
    channelLogin: Required[String]
    isEmbedded: Required[Boolean]


class SharedChatCanRequestUnbanVariables(TypedDict, total=False):
    channelID: Required[ID]


class ChatRepliesVariables(TypedDict, total=False):
    messageID: Required[ID]


class Announcement_CreatorColorVariables(TypedDict, total=False):
    login: Required[String]


class ChatLine_SubsOnlyUpsell_UserSubscriptionProductsVariables(TypedDict, total=False):
    login: Required[String]


class SyncedSettingsChatPauseSettingVariables(TypedDict, total=False): ...


class ChatRoomStateVariables(TypedDict, total=False):
    login: String


class ChatList_ActiveCharityCampaignVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ChatList_BadgesVariables(TypedDict, total=False):
    channelLogin: Required[String]


class Chat_ChannelDataVariables(TypedDict, total=False):
    channelLogin: Required[String]


class Chat_UserDataVariables(TypedDict, total=False): ...


class ClipsExperimentEnrollmentStatusVariables(TypedDict, total=False):
    channelID: Required[ID]


class IsParticipatingDJVariables(TypedDict, total=False):
    channelID: Required[ID]


class ClipsChatCard_ClipVariables(TypedDict, total=False):
    slug: Required[ID]


class SyncedSettingsDeletedMessageDisplaySettingVariables(TypedDict, total=False): ...


class Core_Services_Spade_EmoteCard_UserVariables(TypedDict, total=False):
    channelID: Required[ID]


class EmoteCardVariables(TypedDict, total=False):
    emoteID: Required[ID]
    octaneEnabled: Required[Boolean]
    artistEnabled: Required[Boolean]


class SyncedSettingsReadableChatColorsVariables(TypedDict, total=False): ...


class StreamChatVariables(TypedDict, total=False):
    login: Required[String]


class VideoChatCard_VideoVariables(TypedDict, total=False):
    videoID: Required[ID]


class ChatRoomBanStatusVariables(TypedDict, total=False):
    targetUserID: Required[ID]
    channelID: Required[ID]


class CurrentUserBannedStatusVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ChatModeratorStrikeStatusVariables(TypedDict, total=False):
    targetUserID: Required[ID]
    channelID: Required[ID]


class CurrentUserStrikeStatusVariables(TypedDict, total=False):
    channelLogin: Required[String]


class SharedChatModeratorStrikesVariables(TypedDict, total=False):
    channelIDs: Required[list[Required[ID]]]


class ChatRestrictionsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class MessageBuffer_ChannelVariables(TypedDict, total=False):
    channelLogin: Required[String]


class MessageBufferChatHistoryVariables(TypedDict, total=False):
    channelLogin: Required[String]
    channelID: ID


class Core_Services_Spade_ChatEvent_UserVariables(TypedDict, total=False):
    id: Required[ID]


class ChatLoginModerationTrackingVariables(TypedDict, total=False):
    channelID: Required[ID]
    targetUserID: Required[ID]


class CommunityIntroductionStatusVariables(TypedDict, total=False):
    channelID: ID


class CommunityPoints_IconVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ChannelPointsGlobalContextVariables(TypedDict, total=False): ...


class ChannelPointsContextVariables(TypedDict, total=False):
    channelLogin: Required[String]
    includeGoalTypes: list[Required[CommunityPointsCommunityGoalType]]


class ChannelPointsPredictionContextVariables(TypedDict, total=False):
    channelLogin: Required[String]
    count: Int


class CommunityPointsRewardRedemptionContextVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ChatHighlightSettingsVariables(TypedDict, total=False): ...


class ExtensionsForChannelVariables(TypedDict, total=False):
    channelID: Required[ID]


class FollowButton_UserVariables(TypedDict, total=False):
    login: Required[String]


class OpenCallingCallerInfoVariables(TypedDict, total=False):
    channelLogin: Required[String]


class StreamTogetherCollabStatusVariables(TypedDict, total=False):
    channelLogin: Required[String]


class StreamTogetherCollabSettingsVariables(TypedDict, total=False):
    userID: Required[ID]


class GuestStarDropinRequestsVariables(TypedDict, total=False):
    hostID: Required[ID]


class GuestStarFavoriteGuestsVariables(TypedDict, total=False):
    channelID: Required[ID]
    channelLogin: String
    after: Cursor
    first: Int


class GuestListQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class GetGuestStarSessionQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]
    sessionOptions: Required[GuestStarSessionOptions]
    isAuthenticatedRequest: Required[Boolean]


class GuestStarJoinRequestsVariables(TypedDict, total=False):
    hostID: Required[ID]


class GetLiveStreamIDQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class GuestStarSessionIDVariables(TypedDict, total=False):
    channelLogin: Required[String]


class IsInInviteRaidersExperimentClusterQueryVariables(TypedDict, total=False):
    clusterID: Required[ID]
    userID: Required[ID]


class LiveNotificationsToggle_UserVariables(TypedDict, total=False):
    login: Required[String]


class GetDisplayNameFromIDVariables(TypedDict, total=False):
    userID: Required[ID]


class GetDisplayNameVariables(TypedDict, total=False):
    login: Required[String]


class CurrentUserModeratorStatusVariables(TypedDict, total=False):
    channelID: ID
    channelLogin: String


class UseGetUserLoginVariables(TypedDict, total=False):
    id: Required[ID]


class BansSharingRelationshipsVariables(TypedDict, total=False):
    channelID: Required[ID]


class ModCommentsAndSharedModCommentsVariables(TypedDict, total=False):
    channelID: Required[ID]
    targetID: Required[ID]
    cursor: Cursor


class ChannelSharedBansVariables(TypedDict, total=False):
    channelID: Required[ID]


class LowTrustUserPropertiesVariables(TypedDict, total=False):
    targetUserID: Required[ID]
    channelID: Required[ID]


class PinnedCheersSettingsVariables(TypedDict, total=False):
    login: Required[String]


class PaidPinnedChatVariables(TypedDict, total=False):
    channelID: Required[ID]
    count: Required[Int]
    messageType: Required[PinnedChatMessageType]
    after: Cursor


class PinnedChatSettingsVariables(TypedDict, total=False):
    channelID: Required[ID]


class GetPinnedChatVariables(TypedDict, total=False):
    channelID: Required[ID]
    count: Required[Int]
    after: Cursor


class ChannelPollContext_GetViewablePollVariables(TypedDict, total=False):
    login: Required[String]


class NewPollModalQueryVariables(TypedDict, total=False):
    id: Required[ID]


class ChannelQNAStateVariables(TypedDict, total=False):
    channelID: Required[ID]


class SharedChatUsersInfoVariables(TypedDict, total=False):
    ids: list[Required[ID]]


class SharedChatSessionVariables(TypedDict, total=False):
    channelID: Required[ID]


class CanCreateClipVariables(TypedDict, total=False):
    broadcasterID: ID
    vodID: ID


class UnbanRequestModalVariables(TypedDict, total=False):
    channelID: Required[ID]


class UnbanRequestsListCtxVariables(TypedDict, total=False):
    channelLogin: Required[String]
    limit: Int
    cursor: Cursor
    order: UnbanRequestsSortOrder
    status: UnbanRequestStatus
    userID: ID


class UnbanRequestModLogsVariables(TypedDict, total=False):
    channelID: Required[ID]
    targetID: Required[ID]
    cursor: Cursor


class LastUnbanRequestVariables(TypedDict, total=False):
    channelID: Required[ID]
    includeCanRequestUnban: Required[Boolean]


class UnbanRequestsSettingsVariables(TypedDict, total=False):
    channelID: Required[ID]


class UserUnbanRequestVariables(TypedDict, total=False):
    channelID: Required[ID]
    userID: ID
    limit: Int
    status: UnbanRequestStatus


class VerifyEmail_CurrentUserVariables(TypedDict, total=False): ...


class ActiveWatchPartyVariables(TypedDict, total=False):
    channelLogin: Required[String]


class WatchPartyWidgetGateVariables(TypedDict, total=False):
    channelLogin: String


class TitleMentionsVariables(TypedDict, total=False):
    logins: Required[list[Required[String]]]


class GetUserIDVariables(TypedDict, total=False):
    login: Required[String]
    lookupType: Required[UserLookupType]


class GuestStarSessionsQueryVariables(TypedDict, total=False):
    options: GuestStarSessionsOptions


class RecapsQueryVariables(TypedDict, total=False):
    channelId: ID
    channelLogin: String
    endsAt: Required[Time]


class DiscoveryWatchPartyVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ClipsCards__UserVariables(TypedDict, total=False):
    login: Required[String]
    limit: Int
    cursor: Cursor
    criteria: UserClipsInput


class SelfModStatusVariables(TypedDict, total=False):
    channelID: Required[ID]


class CommonHooks_SearchCategoriesVariables(TypedDict, total=False):
    query: Required[String]
    count: Int
    cursor: Cursor


class CommonHooks_SearchCategoryTagsVariables(TypedDict, total=False):
    query: Required[String]
    count: Int


class CommonHooks_SearchLiveTagsVariables(TypedDict, total=False):
    query: Required[String]
    count: Int
    categoryID: ID


class CommonHooks_SearchStreamsVariables(TypedDict, total=False):
    query: Required[String]
    count: Int
    cursor: Cursor


class CommonHooks_SearchUsersVariables(TypedDict, total=False):
    query: Required[String]
    count: Int
    cursor: Cursor
    hasSubscriptionProductsOnly: Boolean


class CommonHooks_SearchVideosVariables(TypedDict, total=False):
    search: VideoConnectionSearchParams
    count: Int
    cursor: Cursor
    creatorID: ID


class FollowButton_FollowEvent_UserVariables(TypedDict, total=False):
    id: Required[ID]


class Core_Services_Spade_VideoVariables(TypedDict, total=False):
    id: Required[ID]


class DeveloperBadgeDescriptionVariables(TypedDict, total=False):
    userID: ID


class LeaderboardBadgePeriodVariables(TypedDict, total=False):
    channelLogin: String


class SubBadgeDescriptionVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ViewerCardCommunityMomentCarousel_MomentBadgeVariables(TypedDict, total=False):
    channelLogin: Required[String]
    userLogin: Required[String]


class ViewerCardHeaderVariables(TypedDict, total=False):
    targetLogin: String
    channelID: Required[ID]
    hasChannelID: Required[Boolean]


class ViewerCardModLogsCommentsVariables(TypedDict, total=False):
    channelID: Required[ID]
    targetID: Required[ID]
    cursor: Cursor


class ViewerCardModLogsSharedCommentsVariables(TypedDict, total=False):
    channelID: Required[ID]
    targetID: Required[ID]
    cursor: Cursor


class BadgeSetsByChannelVariables(TypedDict, total=False):
    channelID: Required[ID]


class ViewerCardModLogsMessagesBySenderVariables(TypedDict, total=False):
    channelID: Required[ID]
    senderID: Required[ID]
    cursor: Cursor


class ViewerCardVariables(TypedDict, total=False):
    channelID: ID
    channelLogin: Required[String]
    hasChannelID: Required[Boolean]
    giftRecipientLogin: Required[String]
    isViewerBadgeCollectionEnabled: Required[Boolean]
    withStandardGifting: Required[Boolean]
    badgeSourceChannelID: ID
    badgeSourceChannelLogin: Required[String]


class ViewerCard_CommunityMomentsVariables(TypedDict, total=False):
    userLogin: Required[String]
    channelLogin: Required[String]
    first: Required[Int]
    cursor: Cursor


class SessionInviteLinkVariables(TypedDict, total=False):
    sessionID: Required[ID]
    type: Required[InviteLinkType]


class GetIsBrowserSourceAudioEnabledQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class DropinDisplayBadgesVariables(TypedDict, total=False):
    id: Required[ID]


class GuestStarSwapRequestModalUserQueryVariables(TypedDict, total=False):
    userID: Required[ID]


class GuestStarModeratorSettingsVariables(TypedDict, total=False):
    hostLogin: Required[String]


class GuestStarUserSettingsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class StreamTogetherCanStartSessionVariables(TypedDict, total=False):
    channelLogin: Required[String]


class GuestStarActiveJoinRequestVariables(TypedDict, total=False): ...


class GetGuestStarBrowserSourcePropsVariables(TypedDict, total=False):
    channelLogin: Required[String]
    sessionOptions: Required[GuestStarSessionOptions]
    viewOnlyToken: String


class GetGuestStarBrowserSourceListVariables(TypedDict, total=False):
    sessionID: Required[ID]
    userID: ID
    limit: Int
    cursor: Cursor


class GuestStarFollowersVariables(TypedDict, total=False):
    login: String
    limit: Int
    cursor: Cursor
    order: SortOrder


class GuestStarModChannelsListVariables(TypedDict, total=False):
    login: Required[String]
    cursor: Cursor


class GuestStarModListVariables(TypedDict, total=False):
    login: Required[String]
    cursor: Cursor


class GetHostQueueInfoVariables(TypedDict, total=False):
    channelID: Required[ID]


class GuestStarModsVariables(TypedDict, total=False):
    login: String
    first: Int
    after: Cursor


class GuestStarRecentsVariables(TypedDict, total=False):
    channelID: ID
    channelLogin: String
    after: Cursor
    first: Int


class GuestStarRecommendedCollaboratorsVariables(TypedDict, total=False):
    channelID: Required[ID]


class GuestStarRecommendedFavoritesVariables(TypedDict, total=False):
    channelID: Required[ID]


class GetRequestToJoinQueueVariables(TypedDict, total=False):
    input: RequestToJoinQueueOptions
    cursor: Cursor


class GetGuestStarSelfTokenQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]
    isAuthenticatedRequest: Required[Boolean]


class GuestStarStreamInfoVariables(TypedDict, total=False):
    login: Required[String]


class GuestStarSubscribersVariables(TypedDict, total=False):
    channelID: ID
    limit: Int
    cursor: String
    order: Int


class GuestStarTeamVariables(TypedDict, total=False):
    login: String
    first: Int
    after: Cursor


class GuestStarUserVariables(TypedDict, total=False):
    userID: ID


class GetGuestStarUserPreferencesVariables(TypedDict, total=False):
    guestIDs: list[Required[ID]]
    userID: ID
    viewOnlyToken: String


class GuestStarVipsVariables(TypedDict, total=False):
    login: String
    first: Int
    after: Cursor


class GetGuestStarAllSessionInvitesQueryVariables(TypedDict, total=False):
    sessionOptions: Required[GuestStarSessionOptions]


class GuestStarChannelPageCollaborationQueryVariables(TypedDict, total=False):
    options: GuestStarChannelCollaborationOptions
    openCallingIsEnabled: Required[Boolean]


class BansSharingSettingsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class UserProfileImageVariables(TypedDict, total=False):
    login: Required[String]


class ModLogsAccessQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class ViewerCardModLogsPermissionsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ViewerCardModLogsVariables(TypedDict, total=False):
    channelID: Required[ID]
    channelLogin: Required[String]
    targetID: Required[ID]


class Channel_ChatRulesVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ReportMenuItemVariables(TypedDict, total=False):
    channelID: Required[ID]


class SubModalVariables(TypedDict, total=False):
    login: Required[String]
    includeExpiredDunning: Boolean


class GiftSubscribeButton_Gift_EligibilityVariables(TypedDict, total=False):
    recipientLogin: String
    subProductId: Required[String]


class GiftRecipient_UserSubscriptionProductsVariables(TypedDict, total=False):
    channelOwnerID: Required[ID]
    giftRecipientID: Required[String]


class OneClickEligibilityVariables(TypedDict, total=False):
    walletType: Required[WalletType]


class SupportPanelSingleGifting_GiftingOptionsVariables(TypedDict, total=False):
    login: Required[String]
    giftRecipientLogin: String
    withStandardGifting: Boolean
    withCheckoutPrice: Boolean


class SupportPanelSubTokenBalanceVariables(TypedDict, total=False): ...


class SupportPanelSubTokenOffersVariables(TypedDict, total=False):
    id: Required[ID]
    withSingleGifting: Required[Boolean]
    withCommunityGifting: Required[Boolean]
    withRecurringSubscriptions: Required[Boolean]
    recipientLogin: String


class ExtensionPanel_BitsBalanceVariables(TypedDict, total=False): ...


class ExtensionPanelAuthoredExtensionsVariables(TypedDict, total=False): ...


class PopoutExtension_UserQueryVariables(TypedDict, total=False):
    login: Required[String]


class BountyBoardCTAGameNameVariables(TypedDict, total=False):
    id: ID


class TurboProductInformationVariables(TypedDict, total=False):
    name: Required[String]


class SunlightBountyBoardDashboard_BountyListVariables(TypedDict, total=False):
    login: Required[String]
    status: Required[String]
    first: Required[Int]
    cursor: Cursor


class SunlightBountyBoardDashboard_UserSettingsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class DevGetExtensionManifestsSummaryVariables(TypedDict, total=False):
    id: Required[ID]


class ModActionsListVariables(TypedDict, total=False):
    channelID: Required[ID]
    after: Cursor


class ModActionFilterCategoriesVariables(TypedDict, total=False): ...


class ModActionsUserVariables(TypedDict, total=False):
    id: Required[ID]


class Settings_ChannelClipsSettingsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class HomeOfflineCarouselVariables(TypedDict, total=False):
    channelLogin: Required[String]
    includeTrailerUpsell: Required[Boolean]
    trailerUpsellVideoID: Required[ID]


class DropsPrivateCalloutVariables(TypedDict, total=False):
    dropInstanceID: Required[ID]
    channelID: Required[ID]


class IsWatchStreakSharedVariables(TypedDict, total=False):
    channelID: Required[ID]


class LapsedBitsUserCalloutVariables(TypedDict, total=False): ...


class Chat_ShareResub_CalloutDataVariables(TypedDict, total=False):
    channelLogin: Required[String]


class CommunityPointsChatPrivateCalloutUserVariables(TypedDict, total=False):
    login: Required[String]


class StreamEventsActiveCelebrationCalloutQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class Chat_EarnedBadges_ChannelDataVariables(TypedDict, total=False):
    channelID: Required[ID]


class Chat_EarnedBadges_InitialSubStatusVariables(TypedDict, total=False):
    channelLogin: Required[String]


class GifterBadgeStatusVariables(TypedDict, total=False):
    channelID: Required[ID]


class IsInPartnerPlusUpSellNudgeExperimentVariables(TypedDict, total=False):
    clusterID: Required[ID]
    userID: Required[ID]


class Chat_ShareBitsBadgeTier_ChannelDataVariables(TypedDict, total=False):
    channelLogin: Required[String]


class Chat_ShareBitsBadgeTier_AvailableBadgesVariables(TypedDict, total=False):
    channelLogin: Required[String]


class Chat_ShareResub_ChannelDataVariables(TypedDict, total=False):
    channelLogin: Required[String]


class CollaborationPromoPrivateCalloutVariables(TypedDict, total=False):
    channelID: Required[ID]


class SyncedSettingsEmoteAnimationsSettingCalloutDismissedVariables(TypedDict, total=False): ...


class ModerationToolsRewardsQueueLinkVariables(TypedDict, total=False):
    channelLogin: Required[String]


class RewardListVariables(TypedDict, total=False):
    channelID: Required[ID]


class RewardCenter_BitsBalanceVariables(TypedDict, total=False): ...


class WatchStreakExperimentVariables(TypedDict, total=False):
    channelID: Required[ID]


class GetGuestStarSessionChannelPageQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]
    sessionOptions: Required[GuestStarSessionOptions]


class GetGuestSessionBlocksAndBansVariables(TypedDict, total=False):
    channelID: Required[ID]
    sessionOptions: Required[GuestStarSessionOptions]


class RequestToJoinViewerRequirementsQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class BannerNotificationQueryVariables(TypedDict, total=False):
    platform: Required[String]


class SupportPanelSubscribeViewFooterVariables(TypedDict, total=False):
    login: Required[String]
    giftRecipientLogin: String
    withStandardGifting: Boolean


class RealtimeStreamTagListVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ChannelPointsAutomaticRewardsVariables(TypedDict, total=False):
    login: String


class followAccountVerificationSettingsVariables(TypedDict, total=False):
    channelID: Required[ID]


class CommunityTabWhisperUserVariables(TypedDict, total=False):
    login: String


class CommunityTabVariables(TypedDict, total=False):
    login: Required[String]


class ActiveGoalsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AllGoalsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class SegmentPopoverVariables(TypedDict, total=False):
    login: Required[String]


class ChannelPoll_GetUserStatusVariables(TypedDict, total=False):
    channelID: Required[ID]


class StreamerAccentColorVariables(TypedDict, total=False):
    channelID: Required[ID]


class QuestionAndAnswerAccentColorVariables(TypedDict, total=False):
    login: Required[String]


class RequestToJoinAccentColorVariables(TypedDict, total=False):
    channelID: Required[ID]


class ShoutoutHighlightContentQueryVariables(TypedDict, total=False):
    targetLogin: Required[String]


class HappeningNowSettingsVariables(TypedDict, total=False): ...


class RaidNotification_ChannelsVariables(TypedDict, total=False):
    sourceChannelID: Required[ID]
    targetChannelID: Required[ID]


class GetViewerQueueInfoVariables(TypedDict, total=False):
    channelID: Required[ID]
    viewerID: Required[ID]


class HypeTrainCTAVariables(TypedDict, total=False):
    id: ID


class GetHypeTrainExecutionV2Variables(TypedDict, total=False):
    userLogin: Required[String]


class GetHypeTrainExecutionVariables(TypedDict, total=False):
    userLogin: Required[String]


class UpdateRedemptionStatusesProgressVariables(TypedDict, total=False):
    channelLogin: Required[String]


class UserWithBadgesVariables(TypedDict, total=False):
    userID: Required[ID]
    channelLogin: Required[String]


class RedemptionQueueFooterVariables(TypedDict, total=False):
    channelLogin: Required[String]


class RedemptionsByRewardID_PaginatedVariables(TypedDict, total=False):
    channelLogin: Required[String]
    id: ID
    cursor: Cursor
    order: CommunityPointsCustomRewardRedemptionQueueSortOrder
    count: Int


class CoPoRewardQueueVariables(TypedDict, total=False):
    channelLogin: Required[String]


class PayoutMethodInfoQueryVariables(TypedDict, total=False): ...


class PayoutHistoryPageVariables(TypedDict, total=False):
    login: Required[String]


class EstimatedPayVariables(TypedDict, total=False):
    year: Required[Int]
    month: Required[Int]


class PaymentIncentiveMetricsVariables(TypedDict, total=False):
    login: Required[String]


class PayoutBalanceV2Variables(TypedDict, total=False): ...


class PayoutBalanceVariables(TypedDict, total=False): ...


class PayoutEligibilityV2Variables(TypedDict, total=False): ...


class PayoutEligibilityVariables(TypedDict, total=False): ...


class PayoutThresholdVariables(TypedDict, total=False): ...


class PrimeEarningsStatementVariables(TypedDict, total=False):
    channelLogin: Required[String]


class TaxForms_CurrentUserVariables(TypedDict, total=False):
    returnURL: Required[String]


class PaidPinnedChatMessageContentVariables(TypedDict, total=False):
    channelID: Required[ID]
    senderID: ID


class AlertViewerCustomizationDefaultPreviewVariables(TypedDict, total=False):
    channelID: Required[ID]


class GetOauthAppByIDVariables(TypedDict, total=False):
    id: Required[ID]


class DevExtensionSettingsAssignedBillingManagerVariables(TypedDict, total=False):
    id: Required[ID]


class DevExtensionEligibleBillingManagerVariables(TypedDict, total=False):
    orgID: Required[ID]


class DevGetExtensionSecretsVariables(TypedDict, total=False):
    extensionID: Required[ID]


class Directory_DirectoryBannerVariables(TypedDict, total=False):
    slug: Required[String]


class AllChannels_InternationalSectionVariables(TypedDict, total=False):
    platformType: PlatformType
    limit: Int
    options: StreamOptions
    sortTypeIsRecency: Required[Boolean]
    imageWidth: Int
    includeIsDJ: Required[Boolean]


class CategoryChannels_InternationalSectionVariables(TypedDict, total=False):
    slug: Required[String]
    limit: Int
    options: GameStreamOptions
    sortTypeIsRecency: Required[Boolean]
    imageWidth: Int
    includeIsDJ: Required[Boolean]


class DJCalloutEligibilityVariables(TypedDict, total=False): ...


class FollowGameButton_GameVariables(TypedDict, total=False):
    slug: Required[String]


class AnimatedTag_TagDataVariables(TypedDict, total=False):
    id: Required[ID]


class SearchFreeformTagsVariables(TypedDict, total=False):
    userQuery: Required[String]
    first: Int


class PinnedTagsVariables(TypedDict, total=False):
    slug: Required[String]
    languages: list[Required[String]]


class SearchCategoryTagsVariables(TypedDict, total=False):
    userQuery: Required[String]
    limit: Required[Int]


class TagHandlerTagVariables(TypedDict, total=False):
    id: Required[ID]


class DirectoryPage_GameVariables(TypedDict, total=False):
    slug: Required[String]
    limit: Int
    cursor: Cursor
    options: GameStreamOptions
    sortTypeIsRecency: Required[Boolean]
    imageWidth: Int
    includeIsDJ: Required[Boolean]


class DirectoryRoot_DirectoryVariables(TypedDict, total=False):
    slug: String


class FrontPageNew_UserVariables(TypedDict, total=False):
    limit: Int


class OfflineStreamerInformationVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ChannelTrailerSetupVariables(TypedDict, total=False):
    channelLogin: Required[String]


class VideoCommentsVariables(TypedDict, total=False):
    videoID: Required[ID]
    hasVideoID: Required[Boolean]


class VideoCommentsByOffsetOrCursorVariables(TypedDict, total=False):
    videoID: Required[ID]
    contentOffsetSeconds: Int
    cursor: Cursor


class GameSelectorSearchCategoriesVariables(TypedDict, total=False):
    query: Required[String]
    after: Cursor


class Search_SearchGameResultCard_GameVariables(TypedDict, total=False):
    name: Required[String]


class DevExtensionVersionDetailsPageVariables(TypedDict, total=False):
    id: Required[ID]
    version: Required[String]


class BitsOneClickCheckoutVariables(TypedDict, total=False):
    params: Required[PurchasableOfferParams]
    quantity: Int


class WatchPartyCatalogItemsVariables(TypedDict, total=False):
    limit: Int
    after: Cursor
    options: WatchPartyItemSearchOptions
    accessToken: String


class WatchPartyDashboardWidget_GetWatchPartyVariables(TypedDict, total=False):
    channelID: Required[ID]
    accessToken: String


class WatchPartyUser_ChannelStatusVariables(TypedDict, total=False):
    channelLogin: String


class WatchPartyUser_PrimeVideoBenefitVariables(TypedDict, total=False):
    accessToken: Required[String]


class CopyrightSchoolInvitationVariables(TypedDict, total=False): ...


class TaxMismatchSpecificErrors_CurrentUserVariables(TypedDict, total=False): ...


class TaxPreviewReference_CurrentUserVariables(TypedDict, total=False): ...


class TaxPreviewModal_CurrentUserVariables(TypedDict, total=False):
    taxType: Required[TaxInterviewType]
    returnURL: Required[String]


class PayoutOnboardingTaxInterview_CurrentUserVariables(TypedDict, total=False): ...


class TaxInterviewPage_CurrentUserVariables(TypedDict, total=False): ...


class GuestStarBatchCollaborationQueryVariables(TypedDict, total=False):
    options: GuestStarChannelCollaborationOptions
    canDropInFlagEnabled: Required[Boolean]
    openCallingFlagEnabled: Required[Boolean]


class VideoPlayer_CollectionManagerVariables(TypedDict, total=False):
    collectionID: Required[ID]


class ComscoreStreamingQueryVariables(TypedDict, total=False):
    channel: String
    isLive: Required[Boolean]
    isVodOrCollection: Required[Boolean]
    vodID: Required[ID]
    isClip: Required[Boolean]
    clipSlug: Required[ID]


class NielsenContentMetadataVariables(TypedDict, total=False):
    collectionID: Required[ID]
    login: Required[String]
    vodID: Required[ID]
    isCollectionContent: Required[Boolean]
    isLiveContent: Required[Boolean]
    isVODContent: Required[Boolean]


class VideoPlayer_AgeGateOverlayBroadcasterVariables(TypedDict, total=False):
    input: Required[UserByAttribute]


class VideoPlayerClipPostplayRecommendationsOverlayVariables(TypedDict, total=False):
    slug: Required[ID]


class ClipShareOverlayVariables(TypedDict, total=False):
    slug: Required[ID]


class CollectionSideBarVariables(TypedDict, total=False):
    collectionID: Required[ID]


class ContentPolicyPropertiesQueryVariables(TypedDict, total=False):
    login: Required[String]
    vodID: Required[ID]
    isLive: Required[Boolean]
    isVOD: Required[Boolean]


class ExtensionsInfoBalloonVariables(TypedDict, total=False):
    extensionID: Required[ID]
    extensionVersion: String


class ExtensionsNotificationBitsBalanceVariables(TypedDict, total=False): ...


class ExtensionsOverlayVariables(TypedDict, total=False):
    channelLogin: String


class FollowPanelOverlayVariables(TypedDict, total=False):
    channelLogin: Required[String]


class VideoPlayer_MutedSegmentsAlertOverlayVariables(TypedDict, total=False):
    vodID: ID
    includePrivate: Boolean


class OfflineBannerOverlayVariables(TypedDict, total=False):
    login: Required[String]


class OfflineEmbedVODAndScheduleVariables(TypedDict, total=False):
    login: Required[String]


class VideoPlayerOfflineRecommendationsOverlayVariables(TypedDict, total=False):
    login: Required[String]


class VideoPlayer_ChapterSelectButtonVideoVariables(TypedDict, total=False):
    videoID: ID
    includePrivate: Boolean


class VideoPlayerClipsButtonBroadcasterVariables(TypedDict, total=False):
    input: Required[UserByAttribute]


class LiveStreamTimeVariables(TypedDict, total=False):
    login: Required[String]


class VideoPlayerSettingsWithClipMetadataVariables(TypedDict, total=False):
    slug: Required[ID]
    isCommunityMomentsFeatureEnabled: Required[Boolean]


class VideoPlayer_ViewCountVariables(TypedDict, total=False):
    login: Required[String]


class VideoPlayer_VODSeekbarPreviewVideoVariables(TypedDict, total=False):
    videoID: ID
    includePrivate: Boolean


class VideoPlayer_VODSeekbarVariables(TypedDict, total=False):
    vodID: ID
    includePrivate: Boolean


class VideoPlayerPremiumContentOverlayChannelVariables(TypedDict, total=False):
    channel: String


class PreviewContentOverlayQueryVariables(TypedDict, total=False):
    channel: String


class VideoPlayerStatusOverlayChannelVariables(TypedDict, total=False):
    channel: String


class VideoPlayerSubscriberVODOverlayVideoQueryVariables(TypedDict, total=False):
    videoID: Required[ID]


class CollectionTopBarVariables(TypedDict, total=False):
    collectionID: Required[ID]


class VideoPlayerStreamInfoOverlayChannelVariables(TypedDict, total=False):
    channel: String


class VideoPlayerStreamInfoOverlayClipVariables(TypedDict, total=False):
    slug: Required[ID]


class VideoPlayerStreamInfoOverlayVODVariables(TypedDict, total=False):
    videoID: ID


class VideoPreviewOverlayVariables(TypedDict, total=False):
    login: Required[String]


class VideoPlayerVODPostplayRecommendationsVariables(TypedDict, total=False):
    videoID: Required[ID]


class VODPreviewOverlayVariables(TypedDict, total=False):
    vodID: ID


class VideoPlayerPixelAnalyticsUrlsVariables(TypedDict, total=False):
    login: String
    allowAmazon: Boolean
    allowComscore: Boolean
    allowGoogle: Boolean
    allowNielsen: Boolean


class queryUserViewedVideoVariables(TypedDict, total=False): ...


class VideoPlayerStreamMetadataVariables(TypedDict, total=False):
    channel: String


class StreamRefetchManagerVariables(TypedDict, total=False):
    channel: String


class StreamTagsTrackingChannelVariables(TypedDict, total=False):
    channel: String


class AdRequestHandlingVariables(TypedDict, total=False):
    login: Required[String]
    vodID: Required[ID]
    collectionID: Required[ID]
    isLive: Required[Boolean]
    isVOD: Required[Boolean]
    isCollection: Required[Boolean]


class VODMidrollManagerVariables(TypedDict, total=False):
    vodID: Required[ID]
    collectionID: Required[ID]
    isVOD: Required[Boolean]
    isCollection: Required[Boolean]


class VideoAdBannerVariables(TypedDict, total=False):
    input: Required[UserByAttribute]


class VideoAdRequestDeclineVariables(TypedDict, total=False):
    context: Required[AdRequestContext]


class VideoPlayer_VideoSourceManagerVariables(TypedDict, total=False):
    input: Required[UserByAttribute]


class VideoPlayer_CollectionContentVariables(TypedDict, total=False):
    id: Required[ID]


class ContentClassificationContextVariables(TypedDict, total=False):
    login: String
    clipSlug: Required[ID]
    vodID: ID
    isStream: Required[Boolean]
    isVOD: Required[Boolean]
    isClip: Required[Boolean]


class ContentClassificationContextStreamPubsubVariables(TypedDict, total=False):
    channelID: ID


class ExtensionsUIContext_ChannelIDVariables(TypedDict, total=False):
    channelLogin: String


class PlayerTrackingContextQueryVariables(TypedDict, total=False):
    channel: String
    isLive: Required[Boolean]
    collectionID: Required[ID]
    hasCollection: Required[Boolean]
    videoID: Required[ID]
    hasVideo: Required[Boolean]
    slug: Required[ID]
    hasClip: Required[Boolean]


class VideoAccessToken_ClipVariables(TypedDict, total=False):
    slug: Required[ID]
    platform: Required[String]


class VideoAccessToken_CollectionVariables(TypedDict, total=False):
    id: Required[ID]


class PlaybackAccessTokenVariables(TypedDict, total=False):
    login: Required[String]
    isLive: Required[Boolean]
    vodID: Required[ID]
    isVod: Required[Boolean]
    playerType: Required[String]
    platform: Required[String]


class VideoPreviewCard__VideoMomentsVariables(TypedDict, total=False):
    videoId: Required[ID]


class ExtensionPanel_Conditions_BitsBalanceVariables(TypedDict, total=False):
    extensionID: Required[ID]
    extensionVersion: String
    conditionID: Required[ID]
    conditionOwnerID: Required[ID]


class OnDemandReferralsByDimensionVariables(TypedDict, total=False):
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    channel: Required[String]
    contentType: Required[OnDemandContentType]
    dimension: Required[OnDemandDimension]
    first: Required[Int]
    timeZone: Required[String]


class ViewerDiscovery_ReferralsTimeseriesVariables(TypedDict, total=False):
    channelID: Required[ID]
    start: Required[Time]
    end: Required[Time]
    timeZone: Required[String]
    granularity: Required[Granularity]
    dimension: Required[ReferralsDimension]
    filter: Required[ReferralsFilter]
    first: Required[Int]


class SponsorshipTermsContractVariables(TypedDict, total=False):
    query: SponsorshipTermsQuery


class SponsoredSocialPostsUserConnectionsVariables(TypedDict, total=False): ...


class SponsorshipsCreatorProfile_CommunityStatsVariables(TypedDict, total=False):
    channelLogin: Required[String]
    start: Required[Time]
    end: Required[Time]
    first: Required[Int]
    granularityMinutesWatched: Required[Granularity]
    granularityAvgViewers: Required[Granularity]
    timeZone: Required[String]


class GetFeaturedClips_CreatorSponsorshipsVariables(TypedDict, total=False):
    login: Required[String]
    limit: Int
    criteria: UserClipsInput


class GetSponsorshipsCreatorProfilePreviewVariables(TypedDict, total=False):
    channelLogin: Required[String]


class GetGameByName_CreatorSponsorshipsVariables(TypedDict, total=False):
    name: Required[String]


class SponsorshipCampaignInstancePacingsVariables(TypedDict, total=False): ...


class SponsorshipCampaignInstancesVariables(TypedDict, total=False):
    query: SponsorshipInstanceQuery


class ThirdPartySponsorshipOffersVariables(TypedDict, total=False):
    first: Int
    after: Cursor


class MinimalTopNav_MinimalUserVariables(TypedDict, total=False): ...


class ExternallyConfiguredSponsorshipCampaignVariables(TypedDict, total=False):
    campaignID: Required[ID]


class SponsorshipsLearnQueryVariables(TypedDict, total=False): ...


class DevGamesSearchAutocompleteVariables(TypedDict, total=False):
    query: Required[String]
    first: Required[Int]


class DevExtensionVersionPage__ManifestsVariables(TypedDict, total=False):
    id: Required[ID]
    version: Required[String]


class OnsiteNotifications_ListNotificationsVariables(TypedDict, total=False):
    limit: Int
    cursor: Cursor
    language: String
    displayType: OnsiteNotificationDisplayType
    shouldLoadLastBroadcast: Boolean


class OnsiteNotifications_SummaryVariables(TypedDict, total=False): ...


class PersistentNotificationGiftChannelCard_UserInfoVariables(TypedDict, total=False):
    id: Required[ID]


class MomentDetailCallouts_MomentsBadgeVariables(TypedDict, total=False):
    channelID: Required[ID]


class DashboardDMCAHintVariables(TypedDict, total=False):
    id: Required[ID]


class ContentMomentsPageVariables(TypedDict, total=False):
    channelID: Required[ID]
    first: Int
    cursor: Cursor


class PurchaseOrderSuccessSnackbarVariables(TypedDict, total=False):
    channelID: ID


class PurchaseOrderContextGetPurchaseOrderVariables(TypedDict, total=False):
    purchaseOrderID: Required[ID]


class DevUserListEditorVariables(TypedDict, total=False):
    ids: list[Required[ID]]


class DevUserItemForIDVariables(TypedDict, total=False):
    userID: Required[ID]


class BulkAllowlistExtensionUsersVariables(TypedDict, total=False):
    ids: list[Required[ID]]
    logins: list[Required[String]]


class devQuestCampaignDetailsPageOrgGameClientIDQueryVariables(TypedDict, total=False):
    id: Required[ID]


class GetQuestCampaignWithRewardGroupsVariables(TypedDict, total=False):
    campaignID: Required[ID]


class DropV3OrganizationGamesVariables(TypedDict, total=False):
    orgId: Required[ID]


class GetQuestRewardsByOrgVariables(TypedDict, total=False):
    orgID: Required[ID]


class collabViewCountStreamManagerVariables(TypedDict, total=False):
    channelLogin: Required[String]


class FollowersTileQueryVariables(TypedDict, total=False):
    login: Required[String]


class PrerollFreeTileQueryVariables(TypedDict, total=False):
    login: Required[String]


class SinceLastAdTileQueryVariables(TypedDict, total=False):
    login: Required[String]


class SubsTileQueryVariables(TypedDict, total=False):
    login: Required[String]


class ViewersTileQueryVariables(TypedDict, total=False):
    login: Required[String]


class LegacyViewsTileQueryVariables(TypedDict, total=False):
    login: Required[String]


class ViewsTileQueryVariables(TypedDict, total=False):
    login: Required[String]
    startAt: Required[Time]
    endAt: Required[Time]


class TileAdPermissionsQueryVariables(TypedDict, total=False):
    login: Required[String]


class StreamingToolsClientAuthorizationVariables(TypedDict, total=False): ...


class StatsWidgetVariables(TypedDict, total=False):
    login: Required[String]
    isLive: Required[Boolean]


class SportRadarWidgetAccessVariables(TypedDict, total=False): ...


class IncomingRequestsVariables(TypedDict, total=False):
    channelID: Required[ID]
    first: Required[Int]
    after: Cursor
    order: BansSharingRequestsSortOrder


class ExtensionQuickActionVariables(TypedDict, total=False):
    extensionClientID: Required[ID]
    version: Required[String]


class DevBountyBoardDashboard_CampaignDetailVariables(TypedDict, total=False):
    campaignID: Required[ID]
    orgId: Required[ID]


class DevBountyBoardDashboard_CampaignFunnelVariables(TypedDict, total=False):
    campaignID: Required[ID]
    orgId: Required[ID]


class DevBountyBoardDashboard_CampaignReachVariables(TypedDict, total=False):
    countries: Required[list[Required[String]]]
    gameNames: Required[list[Required[String]]]
    streamLengthSeconds: Required[Int]
    targetVarietyBroadcasters: Required[Boolean]
    targetAllGames: Required[Boolean]
    targetAllCountries: Required[Boolean]
    targetAllBroadcasters: Required[Boolean]
    orgId: Required[ID]


class DevBountyBoardDashboard_CampaignStatsVariables(TypedDict, total=False):
    campaignID: Required[ID]
    orgId: Required[ID]


class DevBountyBoardDashboard_CampaignSummaryVariables(TypedDict, total=False):
    campaignID: Required[ID]
    orgId: Required[ID]


class DevBountyBoardDashboard_UserCompanyCanAccessAllGamesVariables(TypedDict, total=False):
    orgId: Required[ID]


class DevBountyBoardDashboard_CompanyGameListVariables(TypedDict, total=False):
    orgId: Required[ID]


class DevBountyBoardDashboard_CompanyGameVariables(TypedDict, total=False):
    id: ID


class DevBountyBoardDashboard_CompanyInfoVariables(TypedDict, total=False):
    orgId: Required[ID]


class SearchStreamsVariables(TypedDict, total=False):
    userQuery: Required[String]


class QuickActions_HostChannelControl_HostRecommendationsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AutohostListPage_ListItemsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AutohostList_SearchUsersVariables(TypedDict, total=False):
    userQuery: Required[String]


class AutohostListPage_SearchUserResultsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AdvancedSettingsSectionSubsAdFree_QueryVariables(TypedDict, total=False):
    login: Required[String]


class AdsManagerSettingsVariables(TypedDict, total=False):
    login: Required[String]


class EmailVerificationBanner_emailVariables(TypedDict, total=False):
    opaqueID: Required[ID]
    userID: Required[ID]
    withUser: Required[Boolean]


class LoyaltyBadgesPage_QueryVariables(TypedDict, total=False):
    login: Required[String]


class LoyaltyBadgesCurrentSection_QueryVariables(TypedDict, total=False):
    channelID: ID
    login: Required[String]


class LoyaltyBadgesManageSection_QueryVariables(TypedDict, total=False):
    channelID: ID
    login: Required[String]


class ExtensionLiveConfigureModalVariables(TypedDict, total=False):
    userLogin: Required[String]


class AutoBannerTermsVariables(TypedDict, total=False):
    channelID: Required[ID]


class ShieldModeStateVariables(TypedDict, total=False):
    channelID: Required[ID]


class ShieldModeUserVariables(TypedDict, total=False):
    id: Required[ID]


class DSAWizard_QueryVariables(TypedDict, total=False):
    adInput: Required[AdInput]
    clientInput: Required[ClientInput]
    geoCode: String


class Copyright_ClipsVariables(TypedDict, total=False):
    slug: Required[ID]


class Copyright_LiveStreamVariables(TypedDict, total=False):
    login: Required[String]


class Copyright_OtherContentVariables(TypedDict, total=False):
    login: Required[String]


class Copyright_VideoVariables(TypedDict, total=False):
    vodID: ID


class CurrentClaimantUserVariables(TypedDict, total=False): ...


class ActivityListStreamStartTimeVariables(TypedDict, total=False):
    channelID: Required[ID]


class ActivityFeed_IsFollowingV2Variables(TypedDict, total=False):
    login: Required[String]


class GetAlertFiltersQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class ActivityListContextV2QueryVariables(TypedDict, total=False):
    channelID: Required[ID]
    limit: Required[Int]
    cursor: Cursor


class EmoteByIdQueryVariables(TypedDict, total=False):
    id: Required[ID]


class AdBreakLiveEventService_QueryAdPropertiesVariables(TypedDict, total=False):
    login: Required[String]


class CreatorChatSettingsQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class UseDragAndDropLayoutsQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]
    type: Required[ChannelDashboardViewType]
    isStreamManagerMosaicLayout: Required[Boolean]
    isTwitchStudioMosaicLayout: Required[Boolean]


class AlertsFeatureLaunchFlagsVariables(TypedDict, total=False):
    channelID: Required[ID]


class AdsManagerAccessQueryVariables(TypedDict, total=False):
    channelOwnerID: ID
    channelLogin: String


class Bits_BuyCard_OffersVariables(TypedDict, total=False):
    withChannel: Required[Boolean]
    isLoggedIn: Required[Boolean]
    channelLogin: Required[String]


class GetBitsButton_BitsVariables(TypedDict, total=False):
    isLoggedIn: Required[Boolean]
    withChannel: Required[Boolean]
    login: Required[String]


class DiscoveryPreferenceQueryVariables(TypedDict, total=False): ...


class DropCurrentSessionContextVariables(TypedDict, total=False):
    channelLogin: String
    channelID: ID


class SearchTray_SearchSuggestionsVariables(TypedDict, total=False):
    queryFragment: Required[String]
    requestID: ID
    withOfflineChannelContent: Boolean
    includeIsDJ: Required[Boolean]


class TopNav_CurrentUserVariables(TypedDict, total=False): ...


class Prime_PrimeOfferList_PrimeOffers_EligibilityVariables(TypedDict, total=False):
    dateOverride: Time
    countryCode: String


class Prime_PrimeOffers_PrimeOfferIds_EligibilityVariables(TypedDict, total=False):
    dateOverride: Time
    countryCode: String


class Prime_PrimeOffers_CurrentUserVariables(TypedDict, total=False): ...


class Prime_Current_UserVariables(TypedDict, total=False): ...


class UserMenuCurrentUserVariables(TypedDict, total=False): ...


class UseLiveBroadcastVariables(TypedDict, total=False):
    channelLogin: Required[String]


class RequireTwoFactorEnabledVariables(TypedDict, total=False): ...


class AdminPollsPageVariables(TypedDict, total=False):
    login: Required[String]


class ChoiceBreakdownVariables(TypedDict, total=False):
    login: Required[String]
    choiceID: Required[ID]
    sort: PollVoterConnectionSort


class WatchPartyPlaybackTrackingVariables(TypedDict, total=False):
    channelLogin: Required[String]


class WatchPartyPlayerLoader__PlayerDecorationVariables(TypedDict, total=False):
    channelID: Required[ID]
    accessToken: Required[String]


class WatchPartyPlayer__EligibilityVariables(TypedDict, total=False):
    channelLogin: Required[String]
    accessToken: Required[String]


class LeaderboardSettings_GetLeaderboardSettingsVariables(TypedDict, total=False):
    login: Required[String]


class autoModQueueBroadcastLanguageQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ShieldModeSettingsVariables(TypedDict, total=False):
    channelID: Required[ID]


class CustomSubBenefitsQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]
    state: Required[CustomSubBenefitState]


class SupportPanelBenefitsSectionBadgesVariables(TypedDict, total=False):
    login: Required[String]


class SupportPanelBenefitsSectionEmotesVariables(TypedDict, total=False):
    login: Required[String]


class SupportPanelBenefitsSectionUserVariables(TypedDict, total=False):
    login: Required[String]


class PrimeSubPurchaseVariables(TypedDict, total=False):
    purchaseOrderID: Required[ID]
    includeOrder: Required[Boolean]


class SupportPanelFooterPrimeStatusVariables(TypedDict, total=False):
    login: Required[String]


class SubscriptionRewardPreviewsVariables(TypedDict, total=False):
    channelID: Required[ID]
    months: Required[Int]
    tier: Required[Int]


class SupportPanelTitleSectionUserInfoVariables(TypedDict, total=False):
    login: Required[String]


class SupportPanel_UpgradeBenefitsVariables(TypedDict, total=False):
    login: Required[String]


class DirectoryVideos_GameVariables(TypedDict, total=False):
    slug: String
    videoLimit: Int
    followedCursor: Cursor
    videoSort: VideoSort
    languages: list[Required[String]]
    broadcastTypes: list[Required[BroadcastType]]
    includePreviewBlur: Boolean


class FeaturedContentCarouselStreamsVariables(TypedDict, total=False):
    language: String
    first: Int
    acceptedMature: Boolean


class ShelvesVariables(TypedDict, total=False):
    requestID: Required[String]
    platform: Required[String]
    langWeightedCCU: Boolean
    limit: Int
    after: Cursor
    itemsPerRow: Int
    context: RecommendationsContext
    imageWidth: Int
    verbose: Boolean
    includeIsDJ: Required[Boolean]


class FollowCueChattersVariables(TypedDict, total=False):
    channelID: Required[ID]


class FollowCueFollowStateVariables(TypedDict, total=False):
    channelID: Required[ID]
    userLogin: Required[String]


class FollowCueSettingsVariables(TypedDict, total=False): ...


class AlertsCheermoteConfigContext_ChannelByIDVariables(TypedDict, total=False):
    id: Required[ID]


class AlertsCheermoteConfigContext_GlobalVariables(TypedDict, total=False): ...


class ViewablePollsPageVariables(TypedDict, total=False):
    login: Required[String]


class ChannelPointsAvailableVariables(TypedDict, total=False):
    login: String


class CommunityPointsCustomizationVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ChannelPointsEnabledVariables(TypedDict, total=False):
    login: String


class ChannelViewerMilestoneSettingsVariables(TypedDict, total=False):
    login: String
    channelID: Required[ID]


class TeamsDashboard_TeamInvitationsVariables(TypedDict, total=False):
    teamName: Required[String]
    cursor: Cursor
    limit: Int


class TeamsDashboard_TeamMembersVariables(TypedDict, total=False):
    teamName: Required[String]
    cursor: Cursor
    limit: Int


class TeamsDashboard_MembersWithRevenueVariables(TypedDict, total=False):
    teamName: Required[String]
    cursor: Cursor
    limit: Int


class TeamsDashboard_TeamRevenuesVariables(TypedDict, total=False):
    teamName: Required[String]
    channelIDs: Required[list[Required[ID]]]
    startDate: Required[Time]
    endDate: Required[Time]


class TeamsDashboardRootVariables(TypedDict, total=False):
    teamName: Required[String]


class TeamsDashboard_SettingsTeamVariables(TypedDict, total=False):
    teamName: Required[String]


class TeamsDashboard_AdBreaksInSecondsVariables(TypedDict, total=False):
    teamName: Required[String]
    teamMembers: list[Required[ID]]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timezone: Required[String]


class TeamsDashboard_AdTimePerHourVariables(TypedDict, total=False):
    teamName: Required[String]
    teamMembers: list[Required[ID]]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timezone: Required[String]


class TeamsDashboard_AverageViewersVariables(TypedDict, total=False):
    teamName: Required[String]
    teamMembers: list[Required[ID]]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timezone: Required[String]


class TeamsDashboard_ChatMessagesVariables(TypedDict, total=False):
    teamName: Required[String]
    teamMembers: list[Required[ID]]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timezone: Required[String]


class TeamsDashboard_CsvExportMetricsVariables(TypedDict, total=False):
    teamName: Required[String]
    teamMemberIDs: list[Required[ID]]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timezone: Required[String]


class TeamsDashboard_FollowsVariables(TypedDict, total=False):
    teamName: Required[String]
    teamMembers: list[Required[ID]]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timezone: Required[String]


class TeamsDashboard_MembersVariables(TypedDict, total=False):
    teamName: Required[String]
    cursor: Cursor


class TeamsDashboard_MinutesWatchedVariables(TypedDict, total=False):
    teamName: Required[String]
    teamMembers: list[Required[ID]]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timezone: Required[String]


class TeamsDashboard_TimeStreamedVariables(TypedDict, total=False):
    teamName: Required[String]
    teamMembers: list[Required[ID]]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timezone: Required[String]


class TeamsDashboard_UniqueChattersVariables(TypedDict, total=False):
    teamName: Required[String]
    teamMembers: list[Required[ID]]
    startAt: Required[Time]
    endAt: Required[Time]
    granularity: Required[Granularity]
    timezone: Required[String]


class TeamsDashboard_VideoPlayReferralsVariables(TypedDict, total=False):
    teamName: Required[String]
    teamMembers: list[Required[ID]]
    start: Required[Time]
    end: Required[Time]
    first: Required[Int]


class TeamsDashboard_TeamAndUserVariables(TypedDict, total=False):
    login: Required[String]
    teamName: Required[String]


class PollsWidget_LatestPollVariables(TypedDict, total=False):
    login: Required[String]


class CharityPurchasableOfferQueryVariables(TypedDict, total=False):
    params: Required[PurchasableOfferParams]


class GetPaymentMethodInsertStatusVariables(TypedDict, total=False):
    insertStatusId: Required[ID]


class UpdatePaymentMethodFormVariables(TypedDict, total=False): ...


class UpdatePaymentMethodModalVariables(TypedDict, total=False): ...


class AlertViewerCustomizationsCalloutBannerVariables(TypedDict, total=False):
    login: Required[String]


class GiftRecipientSearchBar_SearchUsersVariables(TypedDict, total=False):
    query: Required[String]
    after: Cursor


class CharityViewTabsQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class CharityPanelOffer_QueryVariables(TypedDict, total=False):
    channelLogin: Required[String]
    withEligibility: Required[Boolean]


class CharityPanel_PreviewWidgetQueryVariables(TypedDict, total=False):
    login: Required[String]
    charityID: Required[ID]


class CharityPanel_QueryVariables(TypedDict, total=False):
    login: Required[String]
    withEligibility: Boolean


class SupportPanelCommunityGifting_GiftingOptionsVariables(TypedDict, total=False):
    login: Required[String]
    giftRecipientLogin: String
    withStandardGifting: Boolean
    withCheckoutPrice: Boolean


class SupportPanelGiftingSectionChannelLookupVariables(TypedDict, total=False):
    channelLogin: Required[String]


class GiftSubscriptionRewardPreviewsVariables(TypedDict, total=False):
    channelID: Required[ID]
    quantity: Required[Int]
    tier: Required[Int]
    isAnonymous: Required[Boolean]


class SupportPanelGifting_GifterBadgeProgressV2Variables(TypedDict, total=False):
    login: Required[String]


class SupportPanelCommunityGifting_GifterBadgeProgressVariables(TypedDict, total=False):
    login: Required[String]


class OneClickCheckout_CustomGiftingCheckoutPriceVariables(TypedDict, total=False):
    baseParams: Required[PurchasableOfferParams]
    discountedParams: Required[PurchasableOfferParams]
    quantity: Required[Int]


class SupportPanelSubscriptionDetailsVariables(TypedDict, total=False):
    login: Required[String]
    includeExpiredDunning: Boolean
    giftRecipientLogin: String
    withStandardGifting: Boolean


class SupportPanelSingleGifting_UserInfoVariables(TypedDict, total=False):
    login: Required[String]


class SupportPanelSubscribeViewFooterPrimeVariables(TypedDict, total=False):
    login: Required[String]
    giftRecipientLogin: String
    withStandardGifting: Boolean
    withCheckoutPrice: Boolean


class SupportPanelCommunityGifting_TenureBadgeProgressVariables(TypedDict, total=False):
    login: Required[String]


class SupportPanelTitleSectionAvatarVariables(TypedDict, total=False):
    login: Required[String]
    avatarSize: Int


class SupportPanelTitleSectionIsVerifiedVariables(TypedDict, total=False):
    login: Required[String]


class SupportPanelCommunituyGifting_UserInfoVariables(TypedDict, total=False):
    login: Required[String]


class SupportPanelCheckoutServiceVariables(TypedDict, total=False):
    login: Required[String]
    giftRecipientLogin: String
    withStandardGifting: Boolean


class SupportPanelTrackingServiceVariables(TypedDict, total=False):
    login: Required[String]
    CSBTrackingFlagEnabled: Required[Boolean]


class PrimeSubscribe_UserPrimeDataVariables(TypedDict, total=False):
    login: Required[String]


class QuickActionsSubOnlyChatQueryVariables(TypedDict, total=False):
    login: Required[String]


class SubsSettingsSection_QueryVariables(TypedDict, total=False):
    login: Required[String]


class MwebFollowedOfflineChannelsQueryVariables(TypedDict, total=False):
    first: Required[Int]
    after: Cursor
    includeIsDJ: Required[Boolean]


class MwebFollowingPageQueryVariables(TypedDict, total=False):
    requestID: Required[ID]
    location: Required[String]
    context: Required[RecommendationsContext]
    includeIsDJ: Required[Boolean]


class MwebFrontPageQueryVariables(TypedDict, total=False):
    requestID: Required[String]
    platform: Required[String]
    itemsPerRow: Required[Int]
    first: Required[Int]
    after: Cursor
    includeIsDJ: Required[Boolean]


class ProductConsentVariables(TypedDict, total=False): ...


class GetQuestCampaignsByOrgVariables(TypedDict, total=False):
    orgID: Required[ID]


class FeaturedClipsShelfCoverVariables(TypedDict, total=False):
    channelID: Required[ID]


class CollectionCarouselQueryVariables(TypedDict, total=False):
    collectionID: Required[ID]
    first: Required[Int]
    cursor: Cursor
    includePreviewBlur: Boolean


class ChannelVideoShelvesQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]
    first: Required[Int]
    cursor: Cursor
    options: ShelvesOptions
    includePreviewBlur: Boolean


class BadgesPage_QueryVariables(TypedDict, total=False):
    userID: Required[ID]


class MwebDirectoryGameRedirectVariables(TypedDict, total=False):
    name: Required[String]


class PartnerPlusPublicQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class SocialMediaVariables(TypedDict, total=False):
    channelID: ID


class SubscribedContextVariables(TypedDict, total=False):
    id: ID
    login: String


class ChannelRoot_AboutPanelVariables(TypedDict, total=False):
    channelLogin: Required[String]
    skipSchedule: Required[Boolean]
    includeIsDJ: Required[Boolean]


class Settings_ProfilePage_AccountInfoSettingsVariables(TypedDict, total=False): ...


class UserEmoticonPrefix_QueryVariables(TypedDict, total=False): ...


class UsernameRenameStatusVariables(TypedDict, total=False): ...


class DashboardChannelSettingsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ArtistAttributionChannelsVariables(TypedDict, total=False):
    limit: Required[Int]
    cursor: Cursor


class AcknowledgeUnbanRequestPromptVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ChannelVideosContent_GameVariables(TypedDict, total=False):
    categoryID: Required[ID]


class WebShareMetadataQueryVariables(TypedDict, total=False):
    url: Required[String]


class ChannelLayoutVariables(TypedDict, total=False):
    channelLogin: Required[String]
    includeIsDJ: Required[Boolean]


class GetInstagramConnectionVariables(TypedDict, total=False):
    id: Required[ID]


class GetInstagramExportStatusVariables(TypedDict, total=False):
    clipSlug: Required[ID]
    clipAssetID: Required[ID]


class GetInstagramHandleVariables(TypedDict, total=False):
    userID: Required[ID]


class GetTikTokExportStatusVariables(TypedDict, total=False):
    clipSlug: Required[ID]
    clipAssetID: Required[ID]


class GetTikTokVideoDefaultsVariables(TypedDict, total=False):
    userID: Required[ID]


class GetYouTubeConnectionVariables(TypedDict, total=False):
    id: Required[ID]


class GetYouTubeExportStatusVariables(TypedDict, total=False):
    clipSlug: Required[ID]
    clipAssetID: Required[ID]


class ClipContent_EditorVariables(TypedDict, total=False):
    slug: Required[ID]


class ClipMetadataBroadcastInfoQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ClipMetadataVodInfoQueryVariables(TypedDict, total=False):
    vodID: Required[ID]


class ShareClipRenderStatusVariables(TypedDict, total=False):
    slug: Required[ID]


class ContentClipsManagerPolling_ClipVariables(TypedDict, total=False):
    slug: Required[ID]


class ContentClipsManager_UserVariables(TypedDict, total=False):
    login: Required[String]
    limit: Int
    cursor: Cursor
    criteria: UserClipsInput
    includeReferrals: Boolean
    includeGuestsStarParticipants: Boolean
    referralsParams: ClipReferralsParams


class CanViewersExportQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class Clips_ModalDeleteVariables(TypedDict, total=False):
    slug: Required[ID]


class FeatureClips_FeatureSettingsVariables(TypedDict, total=False):
    channelLogin: String


class canShareChannelClipInStoryVariables(TypedDict, total=False):
    channelId: Required[ID]


class CategoryFilterDropdownSearchVariables(TypedDict, total=False):
    query: Required[String]
    after: Cursor


class CreatorCollaborationChannelDataVariables(TypedDict, total=False):
    channelID: Required[ID]
    targetChannelID: Required[ID]


class CreatorCollaborationInitialChannelDataVariables(TypedDict, total=False):
    channelID: Required[ID]


class RaidRecommendationsVariables(TypedDict, total=False):
    userID: Required[ID]
    sourceOptions: list[Required[RaidRecommendationsSource]]


class BanEvasionDetectionSettingsVariables(TypedDict, total=False):
    channelID: Required[ID]


class QuickActionEmoteOnlyChatQueryVariables(TypedDict, total=False):
    login: Required[String]


class SponsorshipToolsCampaignInstancePacingsVariables(TypedDict, total=False): ...


class SponsorshipToolsQueryVariables(TypedDict, total=False): ...


class SponsorshipActivationSettingsVariables(TypedDict, total=False):
    input: Required[UserSponsorshipSettingsInput]


class Community_Moments_CreateMomentQuickActionVariables(TypedDict, total=False):
    channelID: Required[ID]


class QuickActions_MomentClipDownloadVariables(TypedDict, total=False):
    slug: Required[ID]


class CreateMomentHeader_ClipStatusVariables(TypedDict, total=False):
    slug: Required[ID]


class CreateMomentModal_CreatorColorVariables(TypedDict, total=False):
    broadcasterID: Required[ID]


class SubsLandingPageAmbassadorsQueryVariables(TypedDict, total=False):
    userIds: list[Required[ID]]


class Following_CurrentUserVariables(TypedDict, total=False):
    limit: Int
    cursor: Cursor


class SubsLandingPage_SearchStreamersVariables(TypedDict, total=False):
    userQuery: Required[String]


class Offer_EligibilityVariables(TypedDict, total=False):
    login: Required[String]


class EmotePicker_EmotePicker_UserSubscriptionProductsVariables(TypedDict, total=False):
    channelOwnerID: Required[ID]


class EmotePicker_SubUpsell_PriceInfoVariables(TypedDict, total=False):
    channelID: Required[ID]


class WhispersSearchUsersQueryVariables(TypedDict, total=False):
    userQuery: Required[String]


class StandaloneGetAutoModLevelsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class SunlightBountyBoardQA_ChannelPropertiesVariables(TypedDict, total=False):
    channelID: ID


class StreamerCardVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ChannelActiveCharityCampaignVariables(TypedDict, total=False):
    channelID: Required[ID]


class ChannelSocialButtonsVariables(TypedDict, total=False):
    channelID: Required[ID]


class StreamEventCelebrationsChannelPageBadgeVariables(TypedDict, total=False):
    channelLogin: String


class GuestStarViewerFollowingVariables(TypedDict, total=False):
    login: Required[String]


class OneTap_BitsBalanceVariables(TypedDict, total=False): ...


class OneTapSettingsVariables(TypedDict, total=False):
    login: Required[String]


class OneTapFeedVariables(TypedDict, total=False):
    channelID: Required[ID]


class GetIDFromLoginVariables(TypedDict, total=False):
    login: Required[String]


class StoryPreviewChannelVariables(TypedDict, total=False):
    channelID: Required[ID]
    capabilities: list[Required[StoryFeatureCapability]]


class ChannelEditButtonVariables(TypedDict, total=False): ...


class ChannelSupportButtonsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class StreamMetadataVariables(TypedDict, total=False):
    channelLogin: Required[String]
    includeIsDJ: Required[Boolean]


class StreamCategoryLinkCategorySlugByIDVariables(TypedDict, total=False):
    id: Required[ID]


class ChatInput_BadgesVariables(TypedDict, total=False): ...


class ChatSettings_CurrentUserVariables(TypedDict, total=False):
    channelLogin: Required[String]


class CommunityIntroSettingsQueryVariables(TypedDict, total=False):
    login: Required[String]


class ChatSettings_BadgesVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ChatSettingsFollowersOnlySettingVariables(TypedDict, total=False):
    channelLogin: Required[String]


class RecentRaids_ModerationToolsVariables(TypedDict, total=False):
    channelID: ID


class ChatSettingsSlowModeSettingVariables(TypedDict, total=False):
    channelLogin: Required[String]


class BlockedTermsVariables(TypedDict, total=False):
    channelID: Required[ID]


class PermittedTermsVariables(TypedDict, total=False):
    channelID: Required[ID]


class ChatSettingsVariables(TypedDict, total=False):
    channelID: Required[ID]


class SubsOnlyChatQueryVariables(TypedDict, total=False):
    login: Required[String]


class HomeTrackQueryVariables(TypedDict, total=False):
    channelLogin: String


class MwebChannelHomePage_QueryVariables(TypedDict, total=False):
    login: Required[String]


class ContentCopyrightClaimsPageVariables(TypedDict, total=False):
    channelID: Required[ID]
    first: Int
    cursor: Cursor


class ContentCopyrightClaimsPage__SingleClaimVariables(TypedDict, total=False):
    claimID: Required[ID]


class PredictionsQueryVariables(TypedDict, total=False):
    login: Required[String]
    count: Int


class ChannelPointsSettingsNameVariables(TypedDict, total=False):
    login: String


class HomeShelfGamesVariables(TypedDict, total=False):
    channelLogin: Required[String]


class HomeShelfUsersVariables(TypedDict, total=False):
    channelLogin: Required[String]


class HomeShelfVideosVariables(TypedDict, total=False):
    channelLogin: Required[String]
    first: Required[Int]


class HomeShelfEditorVariables(TypedDict, total=False):
    channelLogin: Required[String]


class MwebChannelVideoPage_QueryVariables(TypedDict, total=False):
    login: Required[String]
    archiveLimit: Required[Int]
    archiveCursor: Cursor
    archiveType: BroadcastType
    showArchive: Required[Boolean]


class AdFrequencyQueryVariables(TypedDict, total=False):
    login: Required[String]


class CharityRootVariables(TypedDict, total=False):
    channelLogin: Required[String]


class streamDelayWidgetVariables(TypedDict, total=False):
    channelID: Required[ID]


class DJArtistBlockedListVariables(TypedDict, total=False): ...


class DJMusicCatalogSearchQueryVariables(TypedDict, total=False):
    searchInput: Required[DJCatalogSearchInput]
    cursor: Cursor


class DJOptOut_GetDJStateVariables(TypedDict, total=False):
    channelID: ID


class SecurityPage_ConnectionsVariables(TypedDict, total=False): ...


class Settings_CopyrightAudioDetectionSettingsVariables(TypedDict, total=False): ...


class DevBountyBoardDashboard_CampaignListVariables(TypedDict, total=False):
    fetchPending: Required[Boolean]
    fetchCompleted: Required[Boolean]
    fetchRejected: Required[Boolean]
    fetchApproved: Required[Boolean]
    fetchLive: Required[Boolean]
    orgId: Required[ID]


class ChannelTrailerSettingsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class RecentlyStreamedCategoriesVariables(TypedDict, total=False):
    channelLogin: Required[String]


class DashboardSettingsAutohostSettingsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class StreamerShelfSettingsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ClipsTitleEdit_CommunityMomentVariables(TypedDict, total=False):
    slug: Required[ID]


class ClipsModalIsFollowingVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ClipMetadataVariables(TypedDict, total=False):
    clipSlug: Required[ID]


class DirectoryUpcomingPageVariables(TypedDict, total=False):
    slug: Required[String]


class FeaturedUpcomingStreamsVariables(TypedDict, total=False):
    categoryID: Required[ID]
    options: Required[FeaturedUpcomingStreamsOptions]


class UpcomingScheduleVariables(TypedDict, total=False):
    categoryID: Required[ID]
    options: Required[FeaturedUpcomingStreamsOptions]


class CollaborationInviteLinkExistingGuestStarSessionVariables(TypedDict, total=False):
    currentUserID: Required[ID]


class CollaborationValidateInviteLinkTokenVariables(TypedDict, total=False):
    token: Required[String]


class MwebChannelAboutPage_QueryVariables(TypedDict, total=False):
    login: Required[String]


class AccountCheckupPhoneQueryVariables(TypedDict, total=False): ...


class DropCampaignDetailsVariables(TypedDict, total=False):
    dropID: Required[ID]
    channelLogin: Required[ID]


class ViewerDropsDashboardVariables(TypedDict, total=False):
    fetchRewardCampaigns: Boolean


class InventoryVariables(TypedDict, total=False):
    fetchRewardCampaigns: Boolean


class RewardCodeModalVariables(TypedDict, total=False):
    rewardCampaignID: Required[ID]
    rewardID: Required[ID]


class ViewerCardModLogsAccessQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class BanEvasionDetectionPreviewLinkVariables(TypedDict, total=False):
    channelID: ID


class TeamLandingMemberListVariables(TypedDict, total=False):
    teamName: Required[String]
    withLiveMembers: Required[Boolean]
    liveMembersCursor: Cursor
    withMembers: Required[Boolean]
    membersCursor: Cursor


class TeamsLandingBodyVariables(TypedDict, total=False):
    teamName: Required[String]


class ChannelPage_ChannelInfoBar_UserVariables(TypedDict, total=False):
    login: Required[String]


class Chat_OrbisPresetTextVariables(TypedDict, total=False):
    login: Required[String]


class WatchTrackQueryVariables(TypedDict, total=False):
    channelLogin: String
    videoID: ID
    hasVideoID: Required[Boolean]


class ChannelInfoVariables(TypedDict, total=False):
    channelLogin: Required[String]


class SwitcherClipsCards__GameVariables(TypedDict, total=False):
    categorySlug: Required[String]
    limit: Int
    cursor: Cursor
    criteria: GameClipsInput


class SwitcherDirectoryVideos_CategoryVariables(TypedDict, total=False):
    categorySlug: Required[String]
    videoLimit: Int
    followedCursor: Cursor
    videoSort: VideoSort
    languages: list[Required[String]]
    broadcastTypes: list[Required[BroadcastType]]


class SwitcherStreamMetadataVariables(TypedDict, total=False):
    channelLogin: Required[String]


class Switcher_SwitcherHeaderVariables(TypedDict, total=False):
    slug: Required[String]


class Switcher_CategoryInfoVariables(TypedDict, total=False):
    slug: Required[String]


class DirectoryCollection_BrowsableCollectionVariables(TypedDict, total=False):
    slug: Required[String]
    cursor: Cursor
    limit: Int
    options: BrowsableCollectionStreamsOptions
    imageWidth: Int
    includeIsDJ: Required[Boolean]


class ActivityFeedSponsorshipCampaignInstancePacingsVariables(TypedDict, total=False): ...


class QuickActionsContext_ExtensionsQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ChatViewersVariables(TypedDict, total=False):
    channelLogin: Required[String]


class SearchResultsPage_SearchResultsVariables(TypedDict, total=False):
    query: Required[String]
    options: SearchForOptions
    requestID: ID
    platform: String
    includeIsDJ: Required[Boolean]


class ActiveModsCtxVariables(TypedDict, total=False):
    login: Required[String]
    cursor: Cursor


class AutoModQueueQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class ChannelAutoModSettingsVariables(TypedDict, total=False):
    channelID: Required[ID]


class LowTrustUserDetailsVariables(TypedDict, total=False):
    userID: Required[ID]
    channelID: Required[ID]


class Whispers_Thread_WhisperThreadVariables(TypedDict, total=False):
    id: Required[ID]
    cursor: Cursor


class Whispers_Whispers_UserWhisperThreadsVariables(TypedDict, total=False):
    cursor: Cursor


class Whispers_Tracking_CurrentUserVariables(TypedDict, total=False): ...


class Whispers_Tracking_ReadVariables(TypedDict, total=False):
    threadID: Required[ID]


class PopoutViewerCard_UserQueryVariables(TypedDict, total=False):
    login: Required[String]


class ModViewUserDetails_GiftSubEligibilityVariables(TypedDict, total=False):
    giftRecipientLogin: String
    subProductId: Required[String]


class ModViewUserDetails_SubscriptionProductsVariables(TypedDict, total=False):
    channelID: ID
    giftRecipientLogin: String
    withStandardGifting: Boolean


class QuickAction_ManagePartnerPlusVariables(TypedDict, total=False):
    channelID: Required[ID]


class QuickAction_ManageGoalsModalVariables(TypedDict, total=False):
    channelID: Required[ID]


class QuickAction_ManageGoalsVariables(TypedDict, total=False):
    channelID: Required[ID]


class StreamMarkerVariables(TypedDict, total=False):
    channelLogin: Required[String]


class StoriesForViewersVariables(TypedDict, total=False):
    channelID: Required[ID]
    first: Int
    after: Cursor
    capabilities: list[Required[StoryFeatureCapability]]


class StreamEventsByLoginVariables(TypedDict, total=False):
    login: Required[String]


class ModeratedChannelsVariables(TypedDict, total=False):
    cursor: Cursor


class TopLevelModViewBar_ModeratedChannelsVariables(TypedDict, total=False): ...


class Collection_LocalizedTitleVariables(TypedDict, total=False):
    slug: Required[String]


class ImpressionAnalyticsVariables(TypedDict, total=False):
    channelID: Required[ID]
    start: Required[Time]
    end: Required[Time]
    filter: ImpressionAnalyticsFilter
    dimension: Required[ImpressionAnalyticsDimension]
    first: Int
    includes: list[String]


class ReferralAnalyticsCollectionsCategoriesVariables(TypedDict, total=False):
    channelID: Required[ID]
    start: Required[Time]
    end: Required[Time]
    first: Required[Int]
    dimension: Required[ReferralsDimension]
    filter: Required[ReferralsFilter]


class VerticalsUpcomingSchedulesVariables(TypedDict, total=False):
    categoryID: Required[ID]
    options: Required[FeaturedUpcomingStreamsOptions]


class BrowseVerticalDirectoryVariables(TypedDict, total=False):
    id: Required[ID]
    recommendationsContext: Required[RecommendationsContext]
    contentMin: Required[Int]
    contentMax: Required[Int]
    imageWidth: Int
    includeIsDJ: Required[Boolean]


class PayoutSettingsPage_CurrentUserVariables(TypedDict, total=False): ...


class PollsPageRootVariables(TypedDict, total=False):
    login: Required[String]


class PersistentGoalFollowButton_UserVariables(TypedDict, total=False):
    login: Required[String]


class DMCAViolationCountBannerVariables(TypedDict, total=False):
    id: Required[ID]


class SecurityPage_UserSessionsVariables(TypedDict, total=False):
    limit: Required[Int]
    cursor: Cursor
    persistentCookie: Required[String]


class SubscriptionsManagement_ExpiredSubscriptionsVariables(TypedDict, total=False):
    limit: Int
    cursor: Cursor


class SubscriptionsManagement_SubscriptionBenefitsVariables(TypedDict, total=False):
    limit: Int
    cursor: Cursor
    filter: SubscriptionBenefitFilter
    platform: SubscriptionPlatform


class QuickActionsStreamMarkerQueryVariables(TypedDict, total=False):
    login: Required[String]


class BitsThresholdSettingsForm_GetBitsThresholdSettingsVariables(TypedDict, total=False):
    login: Required[String]


class CheerSettingsForm_GetBitsOnboardedSettingsVariables(TypedDict, total=False):
    login: Required[String]


class ChatClipVariables(TypedDict, total=False):
    clipSlug: Required[ID]


class AccountReactivationModalVariables(TypedDict, total=False):
    login: Required[String]


class Login_FacebookAndEmailVariables(TypedDict, total=False): ...


class AuthShellHeaderVariables(TypedDict, total=False): ...


class UsernameValidator_UserVariables(TypedDict, total=False):
    username: Required[String]


class Settings_ChannelChat_BannedChattersVariables(TypedDict, total=False):
    channelLogin: String
    cursor: Cursor


class CallStateConsistencyQueryVariables(TypedDict, total=False):
    sessionOptions: Required[GuestStarSessionOptions]


class GuestStarSettingsModalNavbarVariables(TypedDict, total=False): ...


class GetGuestStarSelfRoleVariables(TypedDict, total=False):
    sessionOptions: Required[GuestStarSessionOptions]


class GetGuestStarChangelogReadTimestampVariables(TypedDict, total=False): ...


class GetActiveGuestStarSessionQueryVariables(TypedDict, total=False):
    sessionOptions: Required[GuestStarSessionOptions]


class GetSubscriberFollowersCountVariables(TypedDict, total=False):
    channelID: Required[ID]


class FollowerCountVariables(TypedDict, total=False):
    channelID: Required[ID]


class ModAndEditorsListVariables(TypedDict, total=False):
    login: Required[String]
    cursor: Cursor


class GuestStarNameplateSettingsVariables(TypedDict, total=False):
    channelLogin: String
    viewOnlyToken: String


class GetGuestStarSessionSettingsQueryVariables(TypedDict, total=False):
    sessionOptions: Required[GuestStarSessionOptions]


class GetUserIDFromLoginVariables(TypedDict, total=False):
    login: Required[String]
    lookupType: Required[UserLookupType]


class GetHostSettingsVariables(TypedDict, total=False):
    sessionOptions: Required[GuestStarSessionOptions]


class CreatorChatLiveEventVariables(TypedDict, total=False):
    creatorID: Required[ID]


class UseStreamHealthQueryVariables(TypedDict, total=False):
    channelID: Required[ID]
    secondsAgo: Required[Int]
    includeDetails: Required[Boolean]


class Snackbar_AdPropertiesVariables(TypedDict, total=False):
    login: Required[String]


class CopoGoalSnackbar_ActiveChallengesQueryVariables(TypedDict, total=False):
    id: Required[ID]
    includeGoalTypes: list[Required[CommunityPointsCommunityGoalType]]


class AdsManagerFirstTimeUserExperienceQueryVariables(TypedDict, total=False):
    login: Required[String]


class AdsManagerTutorial_AdPropertiesVariables(TypedDict, total=False):
    id: Required[ID]


class DashboardInsights_AbbreviatedVideoPlayReferralsVariables(TypedDict, total=False):
    channelID: Required[ID]
    start: Required[Time]
    end: Required[Time]
    first: Required[Int]


class DashboardInsights_AllVideoPlayReferralsVariables(TypedDict, total=False):
    channelID: Required[ID]
    start: Required[Time]
    end: Required[Time]
    first: Required[Int]


class UserColorVariables(TypedDict, total=False):
    channelID: ID


class ChannelAnalytics_NotificationsVariables(TypedDict, total=False):
    channelName: Required[String]
    startAt: Required[Time]
    endAt: Required[Time]
    first: Required[Int]
    after: Cursor


class ViewerDiscovery_FreeformTagsImpressionsVariables(TypedDict, total=False):
    channelID: Required[ID]
    start: Required[Time]
    end: Required[Time]
    sortBy: FreeformTagSort
    sortOrder: SortOrder
    limit: Int


class ViewerDiscovery_NewVsReturningVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    numberOfIntervals: Required[Int]


class StreamSummaryPage_GetStreamSummaryMetricsVariables(TypedDict, total=False):
    channelID: Required[ID]
    lastStartedAt: Time


class StreamSummaryPage_GetRecentStreamSessionsVariables(TypedDict, total=False):
    channelID: Required[ID]


class StreamSummaryPage_GetStreamSessionVariables(TypedDict, total=False):
    channelID: Required[ID]
    lastStartedAt: Required[Time]


class EmoteAnalytics_ChannelAnalyticsVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    usageType: Required[EmoteUsageType]
    sortBy: EmoteUsageSort
    sortOrder: SortOrder
    emoteGroupProductTypes: list[Required[EmoteGroupProductType]]
    emoteGroupAssetTypes: list[Required[EmoteGroupAssetType]]


class CreatorDropsDashboardCurrentUserVariables(TypedDict, total=False): ...


class CreatorDropsDashboardVariables(TypedDict, total=False):
    channelID: Required[ID]


class DashboardDropCampaignDetailsVariables(TypedDict, total=False):
    dropID: Required[ID]
    channelLogin: Required[ID]


class TaxExpiryQueryVariables(TypedDict, total=False): ...


class DevExtensionListPage_CurrentUserVariables(TypedDict, total=False):
    organizationID: ID
    after: Cursor


class DevOrganizationPanel_GamesDropsVariables(TypedDict, total=False):
    id: Required[ID]


class PendingOrganizationApplicationsVariables(TypedDict, total=False): ...


class DevCurrentUser_AppsVariables(TypedDict, total=False):
    after: Cursor


class BitsCard_BitsVariables(TypedDict, total=False): ...


class BalanceFooter_BitsBadgeVariables(TypedDict, total=False):
    channelID: Required[ID]


class BitsCard_MainCardVariables(TypedDict, total=False):
    name: Required[ID]
    withCheerBombEventEnabled: Required[Boolean]


class PubSubSimulatorVariables(TypedDict, total=False):
    channelLogin: Required[String]


class DeveloperBadgeStatusVariables(TypedDict, total=False):
    orgID: Required[ID]


class DevOrgMembersVariables(TypedDict, total=False):
    orgID: Required[ID]
    membFirst: Int
    membAfter: Cursor
    inviteFirst: Int
    inviteAfter: Cursor


class MwebDirectoryCategoryInfoQueryVariables(TypedDict, total=False):
    categorySlug: Required[String]


class MwebDirectoryCategoryQueryVariables(TypedDict, total=False):
    slug: Required[String]
    limit: Int
    cursor: Cursor
    options: GameStreamOptions
    includeIsDJ: Required[Boolean]


class CoreAuthNewCurrentUserVariables(TypedDict, total=False): ...


class EmailVerificationSuccessVariables(TypedDict, total=False): ...


class VerficationCodeUserVariables(TypedDict, total=False): ...


class PhoneNumber_CountryCodeVariables(TypedDict, total=False): ...


class Settings_Connections_AmazonVariables(TypedDict, total=False): ...


class Settings_Connections_DeviceConnectionVariables(TypedDict, total=False):
    clientID: Required[ID]


class Settings_Connections_ExtensionConnectionsListVariables(TypedDict, total=False): ...


class Settings_Connections_InstagramConnectionVariables(TypedDict, total=False): ...


class Settings_Connections_OtherConnectionsListVariables(TypedDict, total=False): ...


class Settings_Connections_RiotConnectionVariables(TypedDict, total=False): ...


class Settings_Connections_SteamVariables(TypedDict, total=False): ...


class Settings_Connections_TikTokConnectionVariables(TypedDict, total=False): ...


class Settings_Connections_TwitterVariables(TypedDict, total=False): ...


class Settings_Connections_UbisoftVariables(TypedDict, total=False): ...


class Settings_Connections_YoutubeConnectionVariables(TypedDict, total=False): ...


class AdvancedNotificationSettings_UserVariables(TypedDict, total=False):
    limit: Int
    cursor: Cursor


class PlatformNotificationSettings_UserVariables(TypedDict, total=False): ...


class SmartNotificationSettings_UserVariables(TypedDict, total=False): ...


class SettingsNotificationsPage_UserVariables(TypedDict, total=False): ...


class ChatColorPicker_CurrentUserVariables(TypedDict, total=False): ...


class PostSubscriptionsToggleVariables(TypedDict, total=False): ...


class SettingsPrimePage_PrimeEmotesSetPickerVariables(TypedDict, total=False): ...


class SettingsPrimePage_CurrentUserVariables(TypedDict, total=False): ...


class FeedbackItemListVariables(TypedDict, total=False):
    type: Required[String]
    limit: Int
    after: Cursor


class AccountSecurityStatus_PasswordCompromiseStatusVariables(TypedDict, total=False):
    userID: Required[ID]


class BlockGiftedSubsSettingVariables(TypedDict, total=False): ...


class WhisperSettingsVariables(TypedDict, total=False): ...


class BlockedUserDetailVariables(TypedDict, total=False):
    login: String


class Settings_SecurityPage_ContactSettingsVariables(TypedDict, total=False): ...


class HideFounderBadgeVariables(TypedDict, total=False): ...


class HideSubscriptionGiftCountQueryVariables(TypedDict, total=False): ...


class HideSubscriptionStatusSettingVariables(TypedDict, total=False): ...


class DataAccessRequestReportDownloadLinkVariables(TypedDict, total=False):
    requestID: Required[ID]


class DataAccessCategoriesVariables(TypedDict, total=False): ...


class DataAccessRequestsVariables(TypedDict, total=False):
    pageToken: Cursor


class TwoFactorAuthSettings_AccountHealthVariables(TypedDict, total=False): ...


class StorySettingsVariables(TypedDict, total=False): ...


class SettingsTurboPageVariables(TypedDict, total=False): ...


class DisableAccountForm_CurrentUserQueryVariables(TypedDict, total=False): ...


class BulkReportReasonsVariables(TypedDict, total=False): ...


class ReportableModActionTargetsVariables(TypedDict, total=False):
    channelID: Required[ID]
    after: Cursor
    authorType: ModActionAuthorType
    type: ReportableModActionType


class ReportableTargetUserVariables(TypedDict, total=False):
    id: Required[ID]


class DashboardCensus_GetQuestionsVariables(TypedDict, total=False): ...


class NotMePage_verificationRequestVariables(TypedDict, total=False):
    opaqueID: Required[ID]


class UnbanRequestsItemHeaderTabsVariables(TypedDict, total=False):
    channelID: Required[ID]
    targetID: Required[ID]


class UnbanRequestListItemHeaderVariables(TypedDict, total=False):
    requesterID: ID


class UnbanRequestPageVariables(TypedDict, total=False):
    id: Required[ID]


class AddShelfLayoutQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]
    first: Required[Int]
    cursor: Cursor
    includePreviewBlur: Boolean


class ChannelRefreshVideoShelfQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]
    options: ShelvesAvailableOptions
    includePreviewBlur: Boolean


class ExtensionMessageCardVariables(TypedDict, total=False):
    extensionID: Required[ID]
    extensionVersion: String


class ShareVideo_ContentVariables(TypedDict, total=False):
    videoID: Required[ID]
    collectionID: Required[ID]
    hasVideo: Required[Boolean]
    hasCollection: Required[Boolean]


class VideoOptions_UserVariables(TypedDict, total=False):
    contentOwnerID: Required[ID]


class VideoMetadataVariables(TypedDict, total=False):
    channelLogin: Required[String]
    videoID: Required[ID]


class BitsCheckoutRootVariables(TypedDict, total=False): ...


class CollectionManager_EditCollectionVariables(TypedDict, total=False):
    collectionID: Required[ID]
    ownerLogin: Required[String]


class CollectionItemCard_CurrentUserVariables(TypedDict, total=False): ...


class CollectionEditor_SearchCreatorVideosVariables(TypedDict, total=False):
    creatorID: Required[ID]
    collectionID: Required[ID]
    after: Cursor
    search: VideoConnectionSearchParams


class CollectionManager_CreatorCollectionsVariables(TypedDict, total=False):
    creatorLogin: Required[String]
    after: Cursor


class UserImageUploaderVariables(TypedDict, total=False):
    login: Required[String]


class ProfileBannerSettingVariables(TypedDict, total=False): ...


class ProfileImageSettingVariables(TypedDict, total=False): ...


class SettingsTabs_UserVariables(TypedDict, total=False): ...


class ConsentVariables(TypedDict, total=False):
    id: Required[ID]
    includeNewCookieConsentFields: Required[Boolean]
    includeTCData: Required[Boolean]


class IsInRaidBrowserT0T1ExperimentClusterQueryVariables(TypedDict, total=False):
    clusterID: Required[ID]
    userID: Required[ID]


class IsInRaidBrowserT2ExperimentClusterQueryVariables(TypedDict, total=False):
    clusterID: Required[ID]
    userID: Required[ID]


class ChannelPropertiesSettingsPageVariables(TypedDict, total=False):
    channelLogin: Required[String]


class Settings_ChannelVODsSettingsVariables(TypedDict, total=False): ...


class Settings_ContentAccessSettingsVariables(TypedDict, total=False): ...


class RestrictStreamViewingSettingsVariables(TypedDict, total=False):
    channelID: Required[ID]


class GetRawMediaVariables(TypedDict, total=False):
    id: Required[ID]


class LiveStreamInfoClipCreationWebViewQueryVariables(TypedDict, total=False):
    id: Required[ID]


class IsStreamLiveClipCreationWebViewQueryVariables(TypedDict, total=False):
    login: Required[String]


class BitsLandingPageVariables(TypedDict, total=False): ...


class ReportWizardQueryVariables(TypedDict, total=False):
    targetLogin: Required[String]


class SnoozeAdsQuickAction_AdPropertiesVariables(TypedDict, total=False):
    login: Required[String]


class CategoryDetailsVariables(TypedDict, total=False):
    id: Required[ID]
    tagType: Required[TagType]


class EditBroadcastContextQueryVariables(TypedDict, total=False):
    login: Required[String]
    id: Required[ID]
    isChannelOwner: Required[Boolean]
    includesDisabled: Required[Boolean]


class ContentMatchedExtensionConfigureVariables(TypedDict, total=False):
    hasStreamCategory: Required[Boolean]
    streamCategoryID: ID


class ScheduleEditorVariables(TypedDict, total=False):
    channelLogin: Required[String]
    startingWeekday: String
    utcOffsetMinutes: Int


class ScheduleEditorSearchCategoriesVariables(TypedDict, total=False):
    query: Required[String]


class GenericSearchCategoriesVariables(TypedDict, total=False):
    query: Required[String]
    after: Cursor


class getHourlyViewersHeatmapQueryVariables(TypedDict, total=False):
    input: Required[HourlyViewersInput]


class getHourlyViewersReportQueryVariables(TypedDict, total=False):
    input: Required[HourlyViewersReportInput]


class AccountCheckupSecurityStateQueryVariables(TypedDict, total=False): ...


class StreamerAdsManager_QueryAdPropertiesVariables(TypedDict, total=False):
    login: Required[String]


class StreamerAdsManagerPanelAdProperties_QueryVariables(TypedDict, total=False):
    login: Required[String]


class RedeemSubPageEligibilityVariables(TypedDict, total=False):
    channelLogin: Required[String]


class RedeemSubPageQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class RedeemSubSearchChannelVariables(TypedDict, total=False):
    userQuery: Required[String]


class SubsBroadcaster_RENAME1Variables(TypedDict, total=False):
    currentChannelLogin: Required[String]


class EmbedPlayer_ChannelLoginVariables(TypedDict, total=False):
    channelID: Required[ID]


class EmbedPlayer_ChannelDataVariables(TypedDict, total=False):
    channel: String


class VideoPlayer_DeadLTVFollowStatusVariables(TypedDict, total=False):
    id: Required[ID]


class LTVPlayerSourceVariables(TypedDict, total=False):
    id: Required[ID]


class EmbedPlayer_UserDataVariables(TypedDict, total=False): ...


class MWebViewerSheetVariables(TypedDict, total=False):
    targetLogin: Required[String]


class MwebChannelLiveQueryVariables(TypedDict, total=False):
    login: Required[String]
    includeIsDJ: Required[Boolean]


class DJSubsidyPanel_GetDJSubsidyVariables(TypedDict, total=False):
    channelID: ID


class PlusProgramPanel_QueryVariables(TypedDict, total=False):
    channelID: Required[ID]
    contractIdentifier: Required[String]


class ChannelAnalytics_RevenueTermsQueryVariables(TypedDict, total=False):
    channelID: ID


class SubscribersPanelQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class WithholdingRatePanelQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class AdsManagerRefreshBanner_QueryVariables(TypedDict, total=False):
    login: Required[String]


class ChannelPointsSettingsDisplayVariables(TypedDict, total=False):
    login: String


class ChannelCollectionsContentVariables(TypedDict, total=False):
    ownerLogin: Required[String]
    limit: Int
    cursor: Cursor
    includePreviewBlur: Boolean


class FilterableVideoTower_VideosVariables(TypedDict, total=False):
    channelOwnerLogin: Required[String]
    limit: Int
    cursor: Cursor
    broadcastType: BroadcastType
    videoSort: VideoSort
    options: VideoConnectionOptionsInput
    includePreviewBlur: Boolean


class EditableChannelsPageVariables(TypedDict, total=False):
    channelLogin: Required[String]


class PopoutDashboardLiveCardPageQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class SubscribersByGeoQueryVariables(TypedDict, total=False):
    startAt: Required[Time]
    endAt: Required[Time]
    period: Required[TimeSeriesPeriod]
    channel: Required[String]


class CancelReasonsQueryVariables(TypedDict, total=False):
    channel: Required[String]
    startAt: Required[Time]
    endAt: Required[Time]
    period: Required[TimeSeriesPeriod]


class FoundersBadgePanelQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class QuickActions_ClipThat_DJRestrictionsVariables(TypedDict, total=False):
    channelID: Required[ID]


class DevTopNav_User_UserVariables(TypedDict, total=False): ...


class DevOrgListPage_CurrentUserVariables(TypedDict, total=False): ...


class OnboardingSection_CurrentUserVariables(TypedDict, total=False): ...


class DashboardRevenueSettingsIndexPageVariables(TypedDict, total=False):
    channelName: Required[String]


class QuickActionsStreamMarkerTitleQueryVariables(TypedDict, total=False):
    login: Required[String]


class ExtensionMonetizationProductsVariables(TypedDict, total=False):
    extensionID: Required[ID]
    extensionVersion: String


class DevExtensionMonetizationAssignedBillingManagerVariables(TypedDict, total=False):
    id: Required[ID]


class DevExtensionGetVersionManifestsVariables(TypedDict, total=False):
    id: Required[ID]
    after: Cursor


class DevExtensionPayoutInviteStatus_CurrentUserVariables(TypedDict, total=False): ...


class MyCollaborationsShelfVariables(TypedDict, total=False):
    collabShelfGroup: ShelfGroupID
    requestID: Required[String]
    platform: Required[String]
    first: Required[Int]
    imageWidth: Int
    includeIsDJ: Boolean


class ChannelAvatarVariables(TypedDict, total=False):
    channelLogin: Required[String]
    includeIsDJ: Required[Boolean]


class LowerHomeHeaderVariables(TypedDict, total=False):
    channelLogin: Required[String]


class Game_FollowGameCardVariables(TypedDict, total=False):
    name: String


class FollowGamesModal_GamesVariables(TypedDict, total=False):
    limit: Int


class FollowingPage_RecommendedChannelsVariables(TypedDict, total=False):
    first: Int
    recRequestID: Required[String]
    language: Required[String]
    location: String
    context: RecommendationsContext
    imageWidth: Int
    includeIsDJ: Required[Boolean]


class FollowedStreamsVariables(TypedDict, total=False):
    userID: Required[ID]
    limit: Required[Int]


class FollowedStreamsContinueWatchingVariables(TypedDict, total=False):
    limit: Int
    includePreviewBlur: Boolean


class FollowingGames_CurrentUserVariables(TypedDict, total=False):
    limit: Int
    type: FollowedGamesType


class FollowedIndex_CurrentUserVariables(TypedDict, total=False): ...


class FollowedIndex_FollowCountVariables(TypedDict, total=False): ...


class FollowingLive_CurrentUserVariables(TypedDict, total=False):
    limit: Int
    cursor: Cursor
    imageWidth: Int
    includeIsDJ: Required[Boolean]


class FollowedVideos_CurrentUserVariables(TypedDict, total=False):
    limit: Int
    cursor: Cursor
    includePreviewBlur: Boolean


class PauseRaidsSettingsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AuthorizedStreamersPageVariables(TypedDict, total=False):
    channelLogin: Required[String]


class DevBountyBoardDashboard_UserCompanySettingsVariables(TypedDict, total=False):
    orgId: Required[ID]


class UpgradeTermsBannerQueryVariables(TypedDict, total=False): ...


class testMessageEnforcementQueryVariables(TypedDict, total=False):
    input: Required[AutoModContentInput]
    channelID: Required[ID]


class HighlightsChatRoomVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ExperimentSurveyVariables(TypedDict, total=False): ...


class BrandLiftSurveyVariables(TypedDict, total=False): ...


class ChangeUsernameCurrentUserVariables(TypedDict, total=False): ...


class PendingOrganizationApplicationVariables(TypedDict, total=False): ...


class DJSignup_GetDJStateVariables(TypedDict, total=False):
    channelID: ID


class DevSiteCurrentUser_OauthAppsVariables(TypedDict, total=False):
    after: Cursor


class CustomRewardByIDVariables(TypedDict, total=False):
    login: Required[ID]
    id: Required[ID]


class DashboardSettingsUserColorVariables(TypedDict, total=False):
    channelLogin: Required[String]


class SunlightHomeCardsPageVariables(TypedDict, total=False):
    channelID: ID
    browserTime: Time
    platform: CreatorHomePlatformType


class IsInLinkOutExperimentClusterQueryVariables(TypedDict, total=False):
    clusterID: Required[ID]
    userID: Required[ID]


class CreatorHomeGetEmoteDataVariables(TypedDict, total=False):
    channelID: Required[ID]


class CreatorHomeCardsByIdsVariables(TypedDict, total=False):
    channelID: ID
    browserTime: Time
    platform: CreatorHomePlatformType
    cardIDs: list[Required[ID]]


class SunlightHomePageCardsVariables(TypedDict, total=False):
    channelID: ID
    browserTime: Time
    platform: CreatorHomePlatformType


class CreatorHomeUploadProfilePictureModalVariables(TypedDict, total=False):
    channelID: Required[ID]


class ChannelTrailerSelectVariables(TypedDict, total=False):
    channelLogin: Required[String]
    limit: Required[Int]
    cursor: Cursor


class CollectionCreator_CurrentUserVariables(TypedDict, total=False): ...


class CollectionList_CollectionsVariables(TypedDict, total=False):
    channelID: Required[ID]
    after: Cursor


class CollectionList_CollectionsWithVideoIDVariables(TypedDict, total=False):
    channelID: Required[ID]
    videoID: Required[ID]


class VideoManagerActions_FetchMutedTracksVariables(TypedDict, total=False):
    vodID: ID
    includePrivate: Boolean


class VideoManagerActions_FetchVideoVariables(TypedDict, total=False):
    videoID: Required[ID]


class VideoManagerQuery_ChannelVideosVariables(TypedDict, total=False):
    id: Required[ID]
    first: Int
    after: Cursor
    statuses: list[Required[VideoStatus]]
    types: list[Required[BroadcastType]]
    sort: VideoSort


class VideoManagerQuery_ChannelVideosV2Variables(TypedDict, total=False):
    id: Required[ID]
    after: Cursor
    types: list[Required[BroadcastType]]
    sort: VideoSort
    limit: Int
    options: VideoConnectionOptionsInput


class VideoManagerQuery_StorageQuotaVariables(TypedDict, total=False):
    id: Required[ID]


class VideoManagerActions_VideoManagerPropertiesVariables(TypedDict, total=False):
    id: Required[ID]


class SubmitAppeal__CurrentUserVariables(TypedDict, total=False): ...


class EditVideoPropertiesModal_VideoVariables(TypedDict, total=False):
    videoID: Required[ID]


class VideoCard_StreamMarkersVariables(TypedDict, total=False):
    videoID: Required[ID]


class VideoManagerArchiveUpsell_ChannelVariables(TypedDict, total=False):
    channelLogin: Required[String]


class VideoManager_UserVariables(TypedDict, total=False):
    login: Required[String]


class VideoManager_VideoDownloadVariables(TypedDict, total=False):
    videoID: ID


class AdBreaksInSecondsTimeseriesStats_StreamSummaryVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    timeZone: Required[String]
    granularity: Granularity


class ChatMessagesTimeseriesStats_StreamSummaryVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    timeZone: Required[String]
    granularity: Granularity


class ChattersTimeseriesStats_StreamSummaryVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    timeZone: Required[String]
    granularity: Granularity


class ClipViewsTimeseriesStats_StreamSummaryVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    timeZone: Required[String]
    granularity: Granularity


class ClipsCreatedTimeseriesStats_StreamSummaryVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    timeZone: Required[String]
    granularity: Granularity


class FollowsTimeseriesStats_StreamSummaryVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    timeZone: Required[String]
    granularity: Granularity


class LiveViewsTimeseriesStats_StreamSummaryVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    timeZone: Required[String]
    granularity: Granularity


class NewSubscriptionsTimeseriesStats_StreamSummaryVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    timeZone: Required[String]
    granularity: Granularity


class ConcurrentViewersTimeseriesStats_StreamSummaryVariables(TypedDict, total=False):
    channelID: Required[ID]
    startAt: Required[Time]
    endAt: Required[Time]
    timeZone: Required[String]
    granularity: Granularity


class StreamSummary_NoVodErrorConditionsVariables(TypedDict, total=False):
    channelID: Required[ID]


class HighlighterPage_VideoVariables(TypedDict, total=False):
    videoID: Required[ID]


class HighlighterEditorsVariables(TypedDict, total=False):
    channelID: Required[ID]
    includeEditors: Required[Boolean]


class HighlighterClipsVariables(TypedDict, total=False):
    videoID: Required[ID]
    allClipUserIDs: list[Required[ID]]
    cursor: Cursor


class HighlighterMarkersVariables(TypedDict, total=False):
    videoID: Required[ID]
    cursor: Cursor


class HighlighterVODSelector_SearchCreatorVideosVariables(TypedDict, total=False):
    creatorLogin: Required[String]
    after: Cursor
    search: VideoConnectionSearchParams


class UserIdByLoginVariables(TypedDict, total=False):
    channelLogin: Required[String]


class DashboardSettingsPageVariables(TypedDict, total=False): ...


class DashboardSettingsRaidSettingsV2Variables(TypedDict, total=False):
    channelLogin: Required[String]


class ChatSettings_ChannelModesVariables(TypedDict, total=False):
    login: Required[String]


class PartnerPlusQueryVariables(TypedDict, total=False):
    channelID: Required[ID]
    endDate: Required[Time]
    contractIdentifier: Required[String]


class ManagePlusGoalPromptVariables(TypedDict, total=False):
    channelID: Required[ID]


class PartnerPlusPageQueryVariables(TypedDict, total=False):
    channelLogin: Required[String]


class CelebrationContextChannelIDVariables(TypedDict, total=False):
    channelLogin: Required[String]


class CelebrationEmotesVariables(TypedDict, total=False):
    channelID: Required[ID]


class DevExtensionVersionsGetManifestsVariables(TypedDict, total=False):
    id: Required[ID]
    after: Cursor


class ModsVariables(TypedDict, total=False):
    login: Required[String]


class VIPsVariables(TypedDict, total=False):
    login: Required[String]


class VideoMarkersChatCommandVariables(TypedDict, total=False):
    channelLogin: Required[String]


class CommercialCommandHandler_ChannelDataVariables(TypedDict, total=False):
    channelLogin: Required[String]


class Moment_Command_CommunityMomentDetailsVariables(TypedDict, total=False):
    channelID: Required[ID]


class chatRaidChannelIDsVariables(TypedDict, total=False):
    sourceID: Required[String]
    targetID: Required[String]


class SearchDisplaynameVariables(TypedDict, total=False):
    query: Required[String]


class ChatUserVariables(TypedDict, total=False):
    login: Required[String]


class WhisperThreadVariables(TypedDict, total=False):
    id: Required[ID]


class DevOnlyEngineTest1Variables(TypedDict, total=False):
    first: Int


class DevOnlyEngineTest2Variables(TypedDict, total=False):
    first: Int


class DevOnlyEngineTest3Variables(TypedDict, total=False):
    first: Int


class DevOnlySuspenseQuery1Variables(TypedDict, total=False):
    first: Int


class DevOnlySuspenseQuery2Variables(TypedDict, total=False):
    first: Int


class DevOnlyChildGQLVariables(TypedDict, total=False): ...


class DevOnlyLoadableParentVariables(TypedDict, total=False): ...


class GQLLoadingPageVariables(TypedDict, total=False): ...


class Dev_Only_GQLVariables(TypedDict, total=False):
    shouldSkip: Required[Boolean]


class StoriesForCreatorsVariables(TypedDict, total=False):
    first: Int
    after: Cursor
    capabilities: list[Required[StoryFeatureCapability]]


class BrowsePage_AllDirectoriesVariables(TypedDict, total=False):
    limit: Int
    cursor: Cursor
    options: GameOptions


class BrowsePage_PopularVariables(TypedDict, total=False):
    limit: Int
    cursor: Cursor
    platformType: PlatformType
    options: StreamOptions
    sortTypeIsRecency: Required[Boolean]
    imageWidth: Int
    includeIsDJ: Required[Boolean]


class StreamScheduleVariables(TypedDict, total=False):
    login: Required[String]
    startAt: Required[Time]
    endAt: Required[Time]
    startingWeekday: String
    utcOffsetMinutes: Int


class ChannelScheduleSegmentVariables(TypedDict, total=False):
    idToFind: Required[ID]
    isVodID: Required[Boolean]
    isSegmentID: Required[Boolean]
    relativeDate: Required[Time]
    startingWeekday: Required[ScheduleSegmentDay]


class ExtensionQuickActionsStoreVariables(TypedDict, total=False):
    channelLogin: Required[String]


class SunlightChannelQueryVariables(TypedDict, total=False):
    login: Required[String]


class AccountCheckupEmailQueryVariables(TypedDict, total=False): ...


class OneTap_BitsOffersVariables(TypedDict, total=False): ...


class CharityDiscoveryPageVariables(TypedDict, total=False):
    channelLogin: Required[String]
    one: Required[ID]
    two: Required[ID]
    three: Required[ID]
    four: Required[ID]


class CharityDiscoveryPage_SearchCharitiesVariables(TypedDict, total=False):
    first: Int
    after: Cursor
    search: Required[SearchCharitiesParams]


class TicketDescriptionVariables(TypedDict, total=False):
    productName: Required[String]
    taxCountry: String


class TurboSubscriptionProductVariables(TypedDict, total=False):
    name: Required[String]


class UnsubscribePageVariables(TypedDict, total=False):
    productName: Required[String]


class FundraiserSetupPageVariables(TypedDict, total=False):
    channelLogin: Required[String]
    charityID: Required[ID]


class AdsManagerSliderTooltips_QueryVariables(TypedDict, total=False):
    login: String


class AdsGeneralSettingsPrerollNotifications_QueryVariables(TypedDict, total=False):
    login: Required[String]


class AdsGeneralSettingsPrerolls_QueryVariables(TypedDict, total=False):
    login: Required[String]


class AdsGeneralSettingsRevshare_QueryVariables(TypedDict, total=False):
    login: Required[String]


class AdsGeneralSettingsSDAEnabled_QueryVariables(TypedDict, total=False):
    login: Required[String]


class AdsManagerSLYGameText_QueryVariables(TypedDict, total=False):
    id: ID
    hasGameID: Required[Boolean]


class AdsManagerSLYBanner_QueryVariables(TypedDict, total=False):
    login: Required[String]


class CharityParticipationPageQueryVariables(TypedDict, total=False):
    channelName: Required[String]
    charityID: Required[ID]
    first: Required[Int]
    after: Cursor


class FundraisersManagementPageVariables(TypedDict, total=False):
    channelName: Required[String]
    first: Required[Int]
    after: Cursor


class ExtensionDashboardNavVariables(TypedDict, total=False): ...


class RecommendedExtensionVariables(TypedDict, total=False):
    extensionID: Required[ID]


class ExtensionConfigureVariables(TypedDict, total=False): ...


class ExtensionInstallationOAuthModalVariables(TypedDict, total=False): ...


class ExtensionsDiscoveryPageVariables(TypedDict, total=False):
    first: Required[Int]
    afterCursor: Cursor
    skipCurrentUser: Required[Boolean]
    featuredCategoryID: Required[ID]


class ExtensionManagementPageVariables(TypedDict, total=False): ...


class ExtensionPermissionsPageVariables(TypedDict, total=False): ...


class ChannelPointsPredictionsPopoutVariables(TypedDict, total=False):
    channelLogin: Required[String]


class ChatSettings_EditAppearanceVariables(TypedDict, total=False):
    channelID: Required[ID]


class ChannelLeaderboardsVariables(TypedDict, total=False):
    channelID: Required[ID]
    first: Int
    isClipLeaderboardEnabled: Boolean


class ChannelPage__ChannelViewersCountVariables(TypedDict, total=False):
    login: Required[String]


class ChatBadgeList_GetBadgeTiersVariables(TypedDict, total=False):
    login: Required[String]


class CommunityPointsAvailableClaimVariables(TypedDict, total=False):
    channelID: Required[ID]


class ChannelPointsAvailableEarnsVariables(TypedDict, total=False):
    channelLogin: Required[String]


class UserPredictionEventRestrictionVariables(TypedDict, total=False):
    eventID: Required[ID]


class RewardCenter_BitsOffersVariables(TypedDict, total=False): ...


class ModifyEmoteOwnedEmotesVariables(TypedDict, total=False): ...


class UserPointsContributionVariables(TypedDict, total=False):
    channelLogin: Required[String]


class AlertWidgetAlertEmotesByCodesQueryVariables(TypedDict, total=False):
    alertSetToken: Required[Token]
    alertEmoteCodes: Required[list[Required[String]]]


class Alerts_ChannelPointsConfigContextVariables(TypedDict, total=False):
    channelID: Required[ID]


class AlertAssetsVariables(TypedDict, total=False):
    channelID: Required[ID]


class AlertAssetsSizeLimitsVariables(TypedDict, total=False):
    channelID: Required[ID]


class DisplayNameByUserIdsVariables(TypedDict, total=False):
    ids: list[Required[ID]]


class AlertTextToSpeechVoicesQueryVariables(TypedDict, total=False): ...


class DisplayNameByUserIdVariables(TypedDict, total=False):
    id: Required[ID]


class PhoneVerificationAudioScanningDisclosureContextQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class StreamAlertSetQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class CurrentAlertSetQueryVariables(TypedDict, total=False):
    id: Required[ID]


class DefaultAlertVariationsVariables(TypedDict, total=False): ...


class AlertVariationHTMLQueryVariables(TypedDict, total=False):
    variantId: Required[ID]
    token: Token
    channelID: ID


class ViewTermsPage_CurrentUserVariables(TypedDict, total=False): ...


class ChannelAuditVariables(TypedDict, total=False):
    channelLogin: Required[ID]
    first: Int
    cursor: Cursor


class ChannelTrailerReviewVariables(TypedDict, total=False):
    channelLogin: Required[String]
    videoID: Required[ID]
    includeVideo: Required[Boolean]


class ClipsTrackingBaseVariables(TypedDict, total=False):
    slug: Required[ID]


class ClipsRecommendationsVariables(TypedDict, total=False):
    slug: Required[ID]
    requestID: Required[String]
    first: Required[Int]
    after: Cursor
    itemsPerRow: Int
    context: RecommendationsContext
    imageWidth: Int
    includeIsDJ: Boolean


class OnboardingModal_RecommendationsVariables(TypedDict, total=False):
    gamesLimit: Int
    streamsLimit: Int
    recRequestID: Required[ID]
    location: Required[String]
    context: Required[RecommendationsContext]


class OnboardingChannelsSearchVariables(TypedDict, total=False):
    query: Required[String]
    target: SearchForTarget


class OnboardingGamesSearchVariables(TypedDict, total=False):
    query: Required[String]
    target: SearchForTarget


class MwebDirectoryAllQueryVariables(TypedDict, total=False):
    limit: Int
    cursor: Cursor
    options: StreamOptions
    includeIsDJ: Required[Boolean]


class MwebGamesDirectoryQueryVariables(TypedDict, total=False):
    limit: Int
    cursor: Cursor
    options: GameOptions


class Follow_UserVariables(TypedDict, total=False):
    login: Required[String]


class GetMusicChartsQueryVariables(TypedDict, total=False): ...


class getChangelogEntriesVariables(TypedDict, total=False): ...


class DevBountyBoardDashboard_CompanySettingsVariables(TypedDict, total=False):
    orgId: Required[ID]


class ClipsModalDeleteAll_ClipVariables(TypedDict, total=False):
    slug: Required[ID]


class GuestStarExampleClipsQueryVariables(TypedDict, total=False):
    id: Required[ID]


class GuestStarExampleVodsQueryVariables(TypedDict, total=False):
    id: Required[ID]


class ProfileBannerPreferencesVariables(TypedDict, total=False):
    channelLogin: Required[String]


class UploadVideoPlayerBanner_UserVariables(TypedDict, total=False):
    login: Required[String]


class MwebDirectoryCollectionQueryVariables(TypedDict, total=False):
    slug: Required[String]
    cursor: Cursor
    limit: Int
    options: BrowsableCollectionStreamsOptions
    includeIsDJ: Required[Boolean]


class DevPlaygroundClipReEditingQueryVariables(TypedDict, total=False):
    slug: Required[ID]


class ExtensionCategoryPageVariables(TypedDict, total=False):
    categoryID: Required[ID]
    includeCurrentUser: Required[Boolean]
    afterCursor: Cursor


class ExtensionDetailsPageVariables(TypedDict, total=False):
    extensionID: Required[ID]
    extensionVersion: String
    isLoggedIn: Required[Boolean]


class ExtensionSearchPageVariables(TypedDict, total=False):
    afterCursor: Cursor
    search: String
    includeCurrentUser: Required[Boolean]


class SubsNameSettingPage_QueryVariables(TypedDict, total=False):
    login: Required[String]


class RedemptionStatusVariables(TypedDict, total=False):
    id: Required[ID]


class CodeRedemptionValidation_GetKeyStatusVariables(TypedDict, total=False):
    code: Required[String]


class GiftCardRedemptionValidation_GetKeyStatusVariables(TypedDict, total=False):
    code: Required[String]


class FollowersVariables(TypedDict, total=False):
    login: String
    limit: Int
    cursor: Cursor
    order: SortOrder


class UserCardVariables(TypedDict, total=False):
    id: Required[ID]


class FollowedChannelsWidgetVariables(TypedDict, total=False):
    cursor: Cursor


class ChannelPointsCommunityGoalsVariables(TypedDict, total=False):
    login: Required[String]
    includeGoalTypes: list[Required[CommunityPointsCommunityGoalType]]


class CustomRewardsCollectionVariables(TypedDict, total=False):
    login: String


class ChannelPointsCustomRewardsVariables(TypedDict, total=False):
    login: String


class GetTikTokUsernameVariables(TypedDict, total=False):
    userID: Required[ID]


class SponsorshipCampaignInstanceVariables(TypedDict, total=False):
    id: Required[ID]


class StreamPreviewStreamQueryVariables(TypedDict, total=False):
    login: Required[String]
    width: Required[Int]
    height: Required[Int]


class PbyPGameVariables(TypedDict, total=False):
    channelLogin: Required[String]
    tagType: Required[TagType]


class TurboAndSubUpsellVariables(TypedDict, total=False):
    channelLogin: String


class ReportUserPage_UserVariables(TypedDict, total=False):
    targetLogin: Required[String]


class MwebChannelClipPageQueryVariables(TypedDict, total=False):
    slug: Required[ID]


class DevExtensionVersionStatusPageVariables(TypedDict, total=False):
    id: Required[ID]
    version: Required[String]


class TopLevelModViewBar_LiveFollowedChannelsVariables(TypedDict, total=False): ...


class CreatorRewardCampaignsDashboardVariables(TypedDict, total=False):
    channelID: Required[ID]


class ViewMSAPartnerRevshareVariables(TypedDict, total=False): ...


class FeatureClips_ModalFeatureVariables(TypedDict, total=False):
    slug: Required[ID]


class ChannelFollowsVariables(TypedDict, total=False):
    login: String
    limit: Int
    cursor: Cursor
    order: SortOrder


class MwebChannelClipsPage_QueryVariables(TypedDict, total=False):
    login: Required[String]
    featured: Boolean
    period: Required[ClipsPeriod]
    limit: Required[Int]
    cursor: Cursor


class BitsUsageHistoryTab_UserBitsTransactionsVariables(TypedDict, total=False):
    after: Cursor
    filters: Required[BitsTransactionConnectionInput]


class PaymentMethodCard_RecurlyCreditCardVariables(TypedDict, total=False): ...


class PaymentMethodCard_PaymentMethodInsertStatusVariables(TypedDict, total=False):
    workflowID: Required[ID]


class WalletBalancesVariables(TypedDict, total=False):
    bestGuessCountryCode: Required[String]


class PaymentMethodsTab_UserPaymentMethodsVariables(TypedDict, total=False): ...


class TransactionHistoryTab_UserPaymentTransactionsVariables(TypedDict, total=False):
    first: Int
    after: Cursor
    filters: Required[PaymentTransactionConnectionCriteriaInput]


class PartnershipSignupPageApplicationFormVariables(TypedDict, total=False): ...


class VerifyAchievementsVariables(TypedDict, total=False): ...


class VerifyAchievementsQuestsVariables(TypedDict, total=False):
    channelID: Required[ID]


class ChecklistVariables(TypedDict, total=False): ...


class PartnershipSignupPage_ApplicationVariables(TypedDict, total=False): ...


class PartnershipSignupPage_UserVariables(TypedDict, total=False): ...


class UpgradeTermsPageVariables(TypedDict, total=False): ...


class DropsHighlightService_AvailableDropsVariables(TypedDict, total=False):
    channelID: Required[ID]


class DropsHighlightService_VerifyEligibilityVariables(TypedDict, total=False):
    dropInstanceID: Required[ID]


class ShoutoutHighlightServiceQueryVariables(TypedDict, total=False):
    targetLogin: Required[String]
    isLoggedOut: Required[Boolean]


class GetActiveRocketBoostOpportunityVariables(TypedDict, total=False):
    channelID: Required[ID]


class UseViewCountVariables(TypedDict, total=False):
    channelLogin: Required[String]


class DMCAWarningBannerVariables(TypedDict, total=False): ...


class UnbanRequestsListItemUserVariables(TypedDict, total=False):
    id: Required[ID]


class GetSponsorshipsCreatorProfileSettingsVariables(TypedDict, total=False): ...


class ChannelAnalytics_GameOverlapPanelVariables(TypedDict, total=False):
    channelLogin: Required[String]


class RetentionRecentlyCalculatedStreamQueryVariables(TypedDict, total=False):
    channelID: Required[ID]


class ChannelAnalytics_ViewerOverlapPanelVariables(TypedDict, total=False):
    channelLogin: Required[String]


class storiesCreationAccessVariables(TypedDict, total=False):
    userID: Required[ID]


class LiveDashboard_BountyBoard_IsEnabledVariables(TypedDict, total=False):
    channelLogin: Required[String]


class MwebChannelSchedulePage_QueryVariables(TypedDict, total=False):
    login: Required[String]


class MwebChannelVODPage_QueryVariables(TypedDict, total=False):
    videoId: Required[ID]


class SDAUpsell_CurrentUserVariables(TypedDict, total=False): ...


class ClipsCards__GameVariables(TypedDict, total=False):
    categorySlug: Required[String]
    limit: Int
    cursor: Cursor
    criteria: GameClipsInput


class DirectoryGameClips_PageviewVariables(TypedDict, total=False):
    categorySlug: Required[String]
