export type DatabaseSchema = {
  post: Post
  sub_state: SubState
  llm_usage: LlmUsage
}

export type Post = {
  uri: string
  cid: string
  replyParent: string | null
  replyRoot: string | null
  indexedAt: string
  author: string
  text: string
  feed: string
  metric: string
  rating: number
  explanation: string | null
}

export type SubState = {
  service: string
  cursor: number
}

export type LlmUsage = {
  uri: string
  cid: string
  indexedAt: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
}
