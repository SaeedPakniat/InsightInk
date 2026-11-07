export type UiLanguage = 'fa' | 'en'

export type CurrentUser = {
  id: number
  email: string
  display_name: string
  preferred_ui_language: UiLanguage
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

export type SourceType = 'book' | 'article' | 'movie' | 'podcast'

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

export type PublicReport = {
  id: number
  reason: ReportReason
  details: string
  status: 'open' | 'reviewing' | 'resolved' | 'rejected'
  created_at: string
}

export type SavedLibraryItem = {
  saved_at: string
  idea: Idea
}

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
