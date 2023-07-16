import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

type RuleType = {
  includeAuthor: RegExp | null
  excludeAuthor: RegExp | null
  includeText: RegExp | null
  excludeText: RegExp | null
  feed: string
  metric: string
  rating: number
  explanation: string
}

const RULES: RuleType[] = [
  {
    includeAuthor: null,
    excludeAuthor: null,
    // prettier-ignore
    includeText: new RegExp(
      '\bLLMs?\b|language model|言語モデル|transformer model|transformer architecture|self[-\s]attention|gpt[-\s]?4|gpt[-\s]?3\.5|\banthropic\b|hugging\s?face|vicuna|guanaco|wizardlm|airoboros|qlora|ggml|gptq|llama\.cpp|fastchat|gpt4all|langchain|llama[_\s]?index|autogpt|babyagi',
      'i',
    ),
    excludeText: null,
    feed: 'whats-llm',
    metric: 'RegExp',
    rating: 5,
    explanation: '',
  },
  {
    includeAuthor: null,
    excludeAuthor: null,
    // prettier-ignore
    includeText: new RegExp('chat\s?gpt|\bGPT\b|openai', 'i'),
    excludeText: new RegExp('Summary by GPT', 'i'),
    feed: 'whats-gpt',
    metric: 'RegExp',
    rating: 5,
    explanation: '',
  },
  {
    includeAuthor: null,
    excludeAuthor: null,
    // prettier-ignore
    includeText: new RegExp('generative ai|gen ai|生成系?\s?AI', 'i'),
    excludeText: null,
    feed: 'whats-gen-ai',
    metric: 'RegExp',
    rating: 5,
    explanation: '',
  },
  {
    // convert from handle to did
    // https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=newsycombinator.bsky.social
    // 'did:plc:7dh44snmqoa4gyzv3652gm3j', // newsycombinator.bsky.social // cspell:disable-line
    // 'did:plc:apeaukvxm3yedgqw5zcf5pwc', // hacker-news-jp.bsky.social // cspell:disable-line
    // 'did:plc:eidn2o5kwuaqcss7zo7ivye5', // github-trending.bsky.social // cspell:disable-line
    // 'did:plc:ppuqidjyabv5iwzeoxt4fq5o', // github-trending-js.bsky.social // cspell:disable-line
    // 'did:plc:tlhqo7uw5d3rcohosg3io7t5', // hatena-tech.bsky.social // cspell:disable-line
    // 'did:plc:vtpyqvwce4x6gpa5dcizqecy', // techcrunch.bsky.social // cspell:disable-line
    // 'did:plc:z5xxhxqv6elnjzulyf7t22wk', // paper.bsky.social // cspell:disable-line
    // 'did:plc:pv7fudnt4dspurzdnyq73pfe', // techmeme.com // cspell:disable-line
    includeAuthor: new RegExp(
      'did:plc:7dh44snmqoa4gyzv3652gm3j|did:plc:apeaukvxm3yedgqw5zcf5pwc|did:plc:eidn2o5kwuaqcss7zo7ivye5|did:plc:ppuqidjyabv5iwzeoxt4fq5o|did:plc:tlhqo7uw5d3rcohosg3io7t5|did:plc:vtpyqvwce4x6gpa5dcizqecy|did:plc:z5xxhxqv6elnjzulyf7t22wk|did:plc:pv7fudnt4dspurzdnyq73pfe', // cspell:disable-line
      'i',
    ),
    excludeAuthor: null,
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

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const postsToCreate = RULES.map(
      ({
        includeAuthor,
        excludeAuthor,
        includeText,
        excludeText,
        feed,
        metric,
        rating,
        explanation,
      }) =>
        ops.posts.creates
          .filter((create) =>
            includeAuthor ? includeAuthor.test(create.author) : true,
          )
          .filter((create) =>
            excludeAuthor ? !excludeAuthor.test(create.author) : true,
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
