import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

type RuleType = {
  include: RegExp | null
  exclude: RegExp | null
  feed: string
  metric: string
  rating: number
  explanation: string
}

const RULES: RuleType[] = [
  {
    include: /\bLLMs?\b|language model|言語モデル|transformer model|transformer architecture|self[-\s]attention|gpt[-\s]?4|gpt[-\s]?3\.5|\banthropic\b|hugging\s?face|vicuna|guanaco|wizardlm|airoboros|qlora|ggml|gptq|llama\.cpp|fastchat|gpt4all|langchain|llama[_\s]?index|autogpt|babyagi/i,
    exclude: null,
    feed: 'whats-llm',
    metric: 'RegExp',
    rating: 5,
    explanation: '',
  },
  {
    include: /chat\s?gpt|\bGPT\b|openai/i,
    exclude: /Summary by GPT/,
    feed: 'whats-gpt',
    metric: 'RegExp',
    rating: 5,
    explanation: '',
  },
  {
    include: /generative ai|生成系?\s?AI/i,
    exclude: null,
    feed: 'whats-gen-ai',
    metric: 'RegExp',
    rating: 5,
    explanation: '',
  },
]

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
    const postsToCreate = RULES.map(({ include, exclude, feed, metric, rating, explanation }) => (
      ops.posts.creates
        .filter((create) => include ? include.test(create.record.text) : true)
        .filter((create) => exclude ? !exclude.test(create.record.text) : true)
        .map((create) => ({
            uri: create.uri,
            cid: create.cid,
            replyParent: create.record?.reply?.parent.uri ?? null,
            replyRoot: create.record?.reply?.root.uri ?? null,
            indexedAt: new Date().toISOString(),
            author: create.author,
            text: create.record.text,
            feed,
            metric,
            rating,
            explanation,
          }))
      )).flat()

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }
    if (postsToCreate.length > 0) {
      console.log('postsToCreate', postsToCreate)
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
  }
}
