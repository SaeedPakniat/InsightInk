export type UiLanguage = 'fa' | 'en'

export type UserCapabilities = {
  can_moderate: boolean
  can_administer: boolean
}

export type CurrentUser = {
  id: number
  email: string
  display_name: string
  preferred_ui_language: UiLanguage
  avatar_url: string | null
  capabilities: UserCapabilities
}

export type Topic = {
  id: number
  slug: string
  name_fa: string
  name_en: string
}

export type CurrentInterests = {
  topics: Topic[]
}

export type UpdateInterestsPayload = {
  topics: number[]
}

export type ContentLanguage = {
  code: string
  name_en: string
  name_fa: string
  native_name: string
}

export type CurrentContentLanguages = {
  languages: ContentLanguage[]
}

export type UpdateContentLanguagesPayload = {
  languages: string[]
}

export type SourceType =
  'book' | 'article' | 'paper' | 'website' | 'video' | 'podcast' | 'movie' | 'course' | 'other'

export type IdeaCreator = {
  id: number
  display_name: string
  avatar: string | null
  is_verified: boolean
}

export type CreatorPublic = IdeaCreator & {
  bio_fa: string
  bio_en: string
  follower_count: number
  spark_count: number
  idea_count: number
}

export type CreatorSelf = {
  id: number
  user_id: number
  bio_fa: string
  bio_en: string
  avatar: string
  is_verified: boolean
  created_at: string
}

export type CreatorProfilePayload = {
  bio_fa: string
  bio_en: string
}

export type CreatorIdeaStatus = 'draft' | 'published' | 'hidden' | 'withdrawn'

export type CreatorIdea = {
  id: number
  language: string
  title: string
  body: string
  estimated_read_seconds: number
  status: CreatorIdeaStatus
  published_at: string | null
  created_at: string
  updated_at: string
  source: number
  topics: number[]
}

export type CreatorIdeaPayload = {
  language: string
  title: string
  body: string
  estimated_read_seconds: number
  source: number
  topics: number[]
}

export type CreatorSourcePayload = {
  type: SourceType
  title: string
  original_creator_text: string
  language: string
  external_url: string
}

export type ViewerCreatorFollowItem = {
  creator_id: number
  following: boolean
  can_follow: boolean
}

export type ViewerCreatorFollowResponse = {
  items: ViewerCreatorFollowItem[]
}

export type IdeaSource = {
  id: number
  type: SourceType
  title: string
  original_creator_text: string
  language: string
  external_url: string
  cover: string
}

export type Idea = {
  id: number
  language: string
  title: string
  body: string
  estimated_read_seconds: number
  published_at: string | null
  creator: IdeaCreator
  source: IdeaSource
  topics: Topic[]
}

export type FeedPage = {
  next: string | null
  previous: string | null
  results: Idea[]
}

export type SearchFilters = {
  q?: string
  type?: SourceType
  topic?: string
}

export type RecommendationItem = {
  idea: Idea
  score: number
  reason: string
}

export type RelatedIdeaItem = RecommendationItem & {
  similarity: number
}

export type ViewerEngagementItem = {
  idea_id: number
  sparked: boolean
  saved: boolean
}

export type ViewerEngagementResponse = {
  items: ViewerEngagementItem[]
}

export type CommentAuthor = {
  id: number
  display_name: string
}

export type IdeaComment = {
  id: number
  author: CommentAuthor
  body: string
  created_at: string
  updated_at: string
}

export type CreateCommentPayload = {
  body: string
}

export type ReportReason = 'harassment' | 'spam' | 'inappropriate_content' | 'other'

export type CreateCommentReportPayload = {
  reason: ReportReason
  details?: string
}

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'rejected'

export type ReportTargetType = 'comment' | 'user' | 'idea' | 'message'

export type PublicReport = {
  id: number
  reason: ReportReason
  details: string
  status: ReportStatus
  created_at: string
}

export type ModeratorUserSummary = {
  id: number
  display_name: string
}

export type ModerationActionType =
  'review_started' | 'comment_hidden' | 'report_resolved' | 'report_rejected'

export type ModerationAction = {
  id: number
  moderator: ModeratorUserSummary
  action_type: ModerationActionType
  target_type: ReportTargetType
  target_id: number
  note: string
  created_at: string
}

export type ModerationTargetComment = {
  id: number
  author: ModeratorUserSummary
  body: string
  status: 'visible' | 'hidden' | 'deleted'
  created_at: string
  updated_at: string
}

export type ModerationTargetMessage = {
  id: number
  conversation_id: number
  sender: ModeratorUserSummary
  body: string
  created_at: string
  read_at: string | null
}

export type ModerationReportListItem = {
  id: number
  reporter: ModeratorUserSummary
  target_type: ReportTargetType
  target_id: number
  reason: ReportReason
  status: ReportStatus
  created_at: string
  resolved_at: string | null
}

export type ModerationTargetIdea = {
  id: number
  title: string
  body: string
  language: string
  status: CreatorIdeaStatus
  creator: IdeaCreator
  source: IdeaSource
  published_at: string | null
}

export type ModerationReportDetail = ModerationReportListItem & {
  details: string
  target_comment: ModerationTargetComment | null
  target_idea: ModerationTargetIdea | null
  target_message: ModerationTargetMessage | null
  actions: ModerationAction[]
}

export type IdeaModerationState = {
  idea_id: number
  status: CreatorIdeaStatus
  action: 'idea_hidden' | 'idea_restored'
}

export type ModerationReportPage = {
  next: string | null
  previous: string | null
  results: ModerationReportListItem[]
}

export type HiddenModerationIdea = {
  id: number
  title: string
  body_excerpt: string
  language: string
  status: 'hidden'
  creator: {
    id: number
    display_name: string
  }
  source: {
    id: number
    type: SourceType
    title: string
  }
  published_at: string | null
  updated_at: string
}

export type HiddenModerationIdeaPage = {
  next: string | null
  previous: string | null
  results: HiddenModerationIdea[]
}

export type ModerationNotePayload = {
  note?: string
}

export type SavedLibraryItem = {
  saved_at: string
  idea: Idea
}

export type MessagingViewerRole = 'reader' | 'creator'

export type MessagingUserSummary = {
  id: number
  display_name: string
  avatar_url: string | null
}

export type MessagingCreatorSummary = {
  id: number
  user_id: number
  display_name: string
  avatar: string | null
  account_avatar_url: string | null
  is_verified: boolean
}

export type ConversationLastMessage = {
  id: number
  sender_id: number | null
  body_excerpt: string
  created_at: string | null
  read_at: string | null
  is_read: boolean
}

export type Conversation = {
  id: number
  reader: MessagingUserSummary
  creator: MessagingCreatorSummary
  viewer_role: MessagingViewerRole
  last_message: ConversationLastMessage | null
  unread_count: number
  created_at: string
  updated_at: string
}

export type ConversationPage = {
  next: string | null
  previous: string | null
  results: Conversation[]
}

export type DirectMessage = {
  id: number
  sender: MessagingUserSummary
  body: string
  created_at: string
  read_at: string | null
  is_read: boolean
}

export type DirectMessagePage = {
  next: string | null
  previous: string | null
  results: DirectMessage[]
}

export type ConversationReadResult = {
  marked_read: number
  unread_count: number
  read_at: string
}

export type MessagingSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export type MessagingRealtimeEvent =
  | { type: 'sync.required'; reason?: string }
  | {
      type: 'conversation.created'
      conversation: {
        id: number
        reader: { id: number; display_name: string }
        creator: { id: number; user_id: number; display_name: string }
        created_at: string
        updated_at: string
      }
    }
  | {
      type: 'message.created'
      message: {
        id: number
        conversation_id: number
        sender: { id: number; display_name: string }
        body: string
        created_at: string
        read_at: string | null
        is_read: boolean
      }
    }
  | {
      type: 'messages.read'
      conversation_id: number
      read_by_user_id: number
      marked_read: number
      read_at: string
    }
  | { type: 'pong' }
  | { type: 'error'; code?: string; detail?: string }

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = LoginPayload & {
  display_name?: string
  preferred_ui_language?: UiLanguage
}

export type ApiErrorBody = {
  detail?: string
  [field: string]: string | string[] | undefined
}
