export type DatabaseSchema = {
  post: Post
  sub_state: SubState
  rule: Rule
}

export type Post = {
  uri: string
  cid: string
  replyParent: string | null
  replyRoot: string | null
  indexedAt: string
  feed: string
  metric: string
  rating: number
  explanation: string
}

export type SubState = {
  service: string
  cursor: number
}

export type Rule = {
  feed: string
  includeAuthor: string | null
  excludeAuthor: string | null
  includeText: string | null
  excludeText: string | null
  includeLang: string | null
  excludeLang: string | null
}
