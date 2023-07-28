import { InvalidRequestError } from '@atproto/xrpc-server'
import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'
import { SkeletonItem, ReasonRating } from './types'

// max 15 chars
export const shortname = 'whats-chatgpt'

export const handler = async (ctx: AppContext, params: QueryParams) => {
  let builder = ctx.db
    .selectFrom('post')
    .selectAll()
    .where('feed', '=', shortname)
    .where('rating', '>', 4) // TODO: tweak this
    .orderBy('indexedAt', 'desc')
    .orderBy('cid', 'desc')
    .limit(params.limit)

  if (params.cursor) {
    const [indexedAt, cid] = params.cursor.split('::')
    if (!indexedAt || !cid) {
      throw new InvalidRequestError('malformed cursor')
    }
    const timeStr = new Date(parseInt(indexedAt, 10)).toISOString()
    builder = builder
      .where('post.indexedAt', '<', timeStr)
      .orWhere((qb) => qb.where('post.indexedAt', '=', timeStr))
      .where('post.cid', '<', cid)
  }
  const res = await builder.execute()

  const feed: SkeletonItem[] = res.map((row) => ({
    post: row.uri,
    reason: {
      $type: 'io.github.susumuota.feed.defs#skeletonReasonRating',
      metric: row.metric,
      rating: row.rating,
      explanation: row.explanation,
    } as ReasonRating,
  }))

  let cursor: string | undefined
  const last = res.at(-1)
  if (last) {
    cursor = `${new Date(last.indexedAt).getTime()}::${last.cid}`
  }

  return {
    cursor,
    feed,
  }
}
