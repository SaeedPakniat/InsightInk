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
