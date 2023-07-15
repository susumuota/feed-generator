import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

type RuleType = {
  includeAuthors: string[] | null
  excludeAuthors: string[] | null
  includeText: RegExp | null
  excludeText: RegExp | null
  feed: string
  metric: string
  rating: number
  explanation: string
}

const RULES: RuleType[] = [
  {
    includeAuthors: null,
    excludeAuthors: null,
    includeText:
      /\bLLMs?\b|language model|言語モデル|transformer model|transformer architecture|self[-\s]attention|gpt[-\s]?4|gpt[-\s]?3\.5|\banthropic\b|hugging\s?face|vicuna|guanaco|wizardlm|airoboros|qlora|ggml|gptq|llama\.cpp|fastchat|gpt4all|langchain|llama[_\s]?index|autogpt|babyagi/i,
    excludeText: null,
    feed: 'whats-llm',
    metric: 'RegExp',
    rating: 5,
    explanation: '',
  },
  {
    includeAuthors: null,
    excludeAuthors: null,
    includeText: /chat\s?gpt|\bGPT\b|openai/i,
    excludeText: /Summary by GPT/,
    feed: 'whats-gpt',
    metric: 'RegExp',
    rating: 5,
    explanation: '',
  },
  {
    includeAuthors: null,
    excludeAuthors: null,
    includeText: /generative ai|gen ai|生成系?\s?AI/i,
    excludeText: null,
    feed: 'whats-gen-ai',
    metric: 'RegExp',
    rating: 5,
    explanation: '',
  },
  {
    // convert from handle to did
    // https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=newsycombinator.bsky.social
    includeAuthors: [
      'did:plc:7dh44snmqoa4gyzv3652gm3j', // newsycombinator.bsky.social // cspell:disable-line
      'did:plc:apeaukvxm3yedgqw5zcf5pwc', // hacker-news-jp.bsky.social // cspell:disable-line
      'did:plc:eidn2o5kwuaqcss7zo7ivye5', // github-trending.bsky.social // cspell:disable-line
      'did:plc:ppuqidjyabv5iwzeoxt4fq5o', // github-trending-js.bsky.social // cspell:disable-line
      'did:plc:tlhqo7uw5d3rcohosg3io7t5', // hatena-tech.bsky.social // cspell:disable-line
      'did:plc:vtpyqvwce4x6gpa5dcizqecy', // techcrunch.bsky.social // cspell:disable-line
      'did:plc:z5xxhxqv6elnjzulyf7t22wk', // paper.bsky.social // cspell:disable-line
    ],
    excludeAuthors: null,
    includeText: null,
    excludeText: null,
    feed: 'tech-news',
    metric: 'RegExp', // TODO: consider the metric
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
    const postsToCreate = RULES.map(
      ({
        includeAuthors,
        excludeAuthors,
        includeText,
        excludeText,
        feed,
        metric,
        rating,
        explanation,
      }) =>
        ops.posts.creates
          .filter((create) =>
            includeAuthors ? includeAuthors.includes(create.author) : true,
          )
          .filter((create) =>
            excludeAuthors ? !excludeAuthors.includes(create.author) : true,
          )
          .filter((create) =>
            includeText ? includeText.test(create.record.text) : true,
          )
          .filter((create) =>
            excludeText ? !excludeText.test(create.record.text) : true,
          )
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
          })),
    ).flat()

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
