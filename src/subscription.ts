import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

const KEYWORDS = [
  'LLM',
  'GPT',
  'NLP',
  'machine learning',
  'deep learning',
  'neural network',
  'natural language processing',
  'transformer model',
  'language model',
  'generative ai',
  ' llama ',  // to avoid noise
  'huggingface',
  'pytorch',
  'qlora',
]

const isLLM = (text: string) => {
  const lowerText = text.toLowerCase()
  return KEYWORDS.some((tag) => (tag.toLowerCase() === tag ? lowerText : text).includes(tag))
}

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)

    // This logs the text of every post off the firehose.
    // Just for fun :)
    // Delete before actually using
    // for (const post of ops.posts.creates) {
    //   console.log(post.record.text)
    // }

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const postsToCreate = ops.posts.creates
      .filter((create) => {
        // only LLM-related posts
        return isLLM(create.record.text)
      })
      .map((create) => {
        // map LLM-related posts to a db row
        return {
          uri: create.uri,
          cid: create.cid,
          replyParent: create.record?.reply?.parent.uri ?? null,
          replyRoot: create.record?.reply?.root.uri ?? null,
          indexedAt: new Date().toISOString(),
        }
      })

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }
    if (postsToCreate.length > 0) {
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
  }
}
