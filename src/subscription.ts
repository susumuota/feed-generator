import { Database } from './db'
import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

type RuleType = {
  feed: string
  includeAuthor: string[] | null
  excludeAuthor: string[] | null
  includeText: RegExp | null
  excludeText: RegExp | null
}

const loadRules = async (db: Database): Promise<RuleType[]> => {
  const rules = await db.selectFrom('rule').selectAll().execute()
  return rules.map(
    ({ feed, includeAuthor, excludeAuthor, includeText, excludeText }) => ({
      feed,
      includeAuthor: includeAuthor ? includeAuthor.split('|') : null,
      excludeAuthor: excludeAuthor ? excludeAuthor.split('|') : null,
      includeText: includeText ? new RegExp(includeText, 'i') : null,
      excludeText: excludeText ? new RegExp(excludeText, 'i') : null,
    }),
  )
}

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  rules: RuleType[] = []

  async handleEvent(evt: RepoEvent) {
    this.rules = this.rules.length === 0 ? await loadRules(this.db) : this.rules

    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)

    const postsToCreate = this.rules
      .map(({ feed, includeAuthor, excludeAuthor, includeText, excludeText }) =>
        ops.posts.creates
          .filter((create) =>
            includeAuthor ? includeAuthor.includes(create.author) : true,
          )
          .filter((create) =>
            excludeAuthor ? !excludeAuthor.includes(create.author) : true,
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
            feed,
            metric: 'rule',
            rating: 5,
            explanation: '',
          })),
      )
      .flat()

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
