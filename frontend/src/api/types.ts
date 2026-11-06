export type UiLanguage = 'fa' | 'en'

export type CurrentUser = {
  id: number
  email: string
  display_name: string
  preferred_ui_language: UiLanguage
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
