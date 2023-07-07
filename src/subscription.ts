import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

type RuleType = {
  includePattern: RegExp | null
  excludePattern: RegExp | null
  feedShortName: string
}

const RULES: RuleType[] = [
  {
    includePattern: /\bLLMs?\b|\bNLP\b|language model|言語モデル|natural language processing|自然言語処理|generative ai|生成系?AI|transformer model|self[-\s]attention|gpt[-\s]?4|gpt[-\s]?3\.5|huggingface|qlora|ggml|gptq|llama\.cpp|fastchat|gpt4all|langchain|llama[_\s]?index|autogpt|babyagi/i,
    excludePattern: null,
    feedShortName: 'whats-llm',
  },
  {
    includePattern: /chat\s?gpt|\bGPT\b/i,
    excludePattern: /Summary by GPT/,
    feedShortName: 'whats-gpt',
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
    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }

    const postsToCreate = RULES.map(({ includePattern, excludePattern, feedShortName }) => (
      ops.posts.creates
        .filter((create) => excludePattern ? !excludePattern.test(create.record.text) : true)
        .filter((create) => includePattern ? includePattern.test(create.record.text) : true)
        .map((create) => ({
          uri: create.uri,
          cid: create.cid,
          replyParent: create.record?.reply?.parent.uri ?? null,
          replyRoot: create.record?.reply?.root.uri ?? null,
          indexedAt: new Date().toISOString(),
          feedShortName: feedShortName,
          text: create.record.text,
          score: -1.0,
        }))
      )).flat()
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
