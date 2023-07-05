import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

const INCLUDES = [
  'LLM',
  // 'GPT',  // too noisy, e.g. "ChatGPT"
  'NLP',
  'LLaMA',
  'natural language processing',
  '自然言語処理',
  'language model',
  '言語モデル',
  'generative ai',
  '生成AI',
  '生成系AI',
  'transformer model',
  'self-attention',
  'self attention',
  'gpt-4',
  'gpt-3.5',
  'text-davinci',
  'code-davinci',
  'huggingface',
  'qlora',
  'ggml',
  'gptq',
  'llama.cpp',
  'fastchat',
  'gpt4all',
  'wizardlm',
  'wizardcoder',
]

const EXCLUDES = [
  'Summary by GPT',
]

const isLLM = (text: string) => {
  const lowerText = text.toLowerCase()
  const isExclude = EXCLUDES.some((tag) => (tag.toLowerCase() === tag ? lowerText : text).includes(tag))
  if (isExclude) return false
  const isInclude = INCLUDES.some((tag) => (tag.toLowerCase() === tag ? lowerText : text).includes(tag))
  if (!isInclude) return false
  // TODO: ask GPT-3 if this is a post about LLM research
  return true
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
        if (isLLM(create.record.text)) {
          console.log(create)
          return true
        } else {
          return false
        }
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
