// copy from https://github.com/bluesky-social/feed-generator#skeleton-metadata

export type SkeletonItem = {
  post: string // post URI

  // optional reason for inclusion in the feed
  // (generally to be displayed in client)
  reason?: Reason
}

// for now, the only defined reason is a repost, but this is open to extension
export type Reason = ReasonRepost | ReasonRating

export type ReasonRepost = {
  $type: 'app.bsky.feed.defs#skeletonReasonRepost'
  repost: string // repost URI
}

export type ReasonRating = {
  $type: 'io.github.susumuota.feed.defs#skeletonReasonRating'
  metric: string
  rating: number
  explanation: string
}
