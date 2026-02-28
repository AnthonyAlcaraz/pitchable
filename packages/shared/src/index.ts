// Shared types for DeckPilot
// These mirror the Prisma schema enums for frontend use

export type UserRole = 'USER' | 'ADMIN'

export type UserTier = 'FREE' | 'PRO' | 'ENTERPRISE'

export type PresentationType = 'STANDARD' | 'VC_PITCH' | 'TECHNICAL' | 'EXECUTIVE'

export type PresentationStatus = 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type SlideType =  | 'TITLE'  | 'PROBLEM'  | 'SOLUTION'  | 'ARCHITECTURE'  | 'PROCESS'  | 'COMPARISON'  | 'DATA_METRICS'  | 'CTA'  | 'CONTENT'  | 'QUOTE'  | 'VISUAL_HUMOR'  | 'OUTLINE'  | 'TEAM'  | 'TIMELINE'  | 'SECTION_DIVIDER'  | 'METRICS_HIGHLIGHT'  | 'FEATURE_GRID'  | 'PRODUCT_SHOWCASE'  | 'LOGO_WALL'  | 'MARKET_SIZING'  | 'SPLIT_STATEMENT'  | 'MATRIX_2X2'  | 'WATERFALL'  | 'FUNNEL'  | 'COMPETITIVE_MATRIX'  | 'ROADMAP'  | 'PRICING_TABLE'  | 'UNIT_ECONOMICS'  | 'SWOT'  | 'THREE_PILLARS'  | 'HOOK'  | 'BEFORE_AFTER'  | 'SOCIAL_PROOF'  | 'OBJECTION_HANDLER'  | 'FAQ'  | 'VERDICT'  | 'COHORT_TABLE'  | 'PROGRESS_TRACKER'

export type ExportFormat = 'PPTX' | 'PDF' | 'GOOGLE_SLIDES' | 'REVEAL_JS'

export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface UserDto {
  id: string
  email: string
  name: string
  role: UserRole
  tier: UserTier
  creditBalance: number
  createdAt: string
}

export interface ThemeDto {
  id: string
  name: string
  displayName: string
  description: string
  isBuiltIn: boolean
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  headingFont: string
  bodyFont: string
  colorPalette: Record<string, string>
}

export interface PresentationDto {
  id: string
  title: string
  description: string | null
  presentationType: PresentationType
  status: PresentationStatus
  themeId: string
  imageCount: number
  createdAt: string
  updatedAt: string
}

export interface SlideDto {
  id: string
  slideNumber: number
  title: string
  body: string
  speakerNotes: string | null
  slideType: SlideType
  imageUrl: string | null
  imagePrompt: string | null
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  tokens: AuthTokens
  user: UserDto
}

export interface ApiError {
  statusCode: number
  error: string
  message: string
  timestamp: string
  path: string
}

export interface ConstraintViolation {
  type: 'color' | 'typography' | 'density' | 'layout'
  message: string
  field: string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  valid: boolean
  violations: ConstraintViolation[]
}

// ── Generative UI Types ───────────────────────────────────

export interface LayoutOption {
  id: string
  name: string
  description: string
  slideType: SlideType
}

export interface ThemeOption {
  id: string
  name: string
  displayName: string
  colorPalette: Record<string, string>
  headingFont: string
  bodyFont: string
  score: number
  category: string
}

export interface ImageCandidate {
  id: string
  imageUrl: string
  score: number
  prompt: string
}

export type InteractionType = 'theme_selection' | 'layout_selection' | 'image_selection'

export interface InteractionResponse {
  interactionType: InteractionType
  contextId: string
  selection: unknown
}
