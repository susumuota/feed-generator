import { Kysely, Migration, MigrationProvider } from 'kysely'
import { DatabaseSchema } from './schema'

const migrations: Record<string, Migration> = {}

export const migrationProvider: MigrationProvider = {
  async getMigrations() {
    return migrations
  },
}

migrations['001'] = {
  async up(db: Kysely<any>) {
    await db.schema
      .createTable('post')
      .addColumn('uri', 'varchar', (col) => col.primaryKey())
      .addColumn('cid', 'varchar', (col) => col.notNull())
      .addColumn('replyParent', 'varchar')
      .addColumn('replyRoot', 'varchar')
      .addColumn('indexedAt', 'varchar', (col) => col.notNull())
      .addColumn('feed', 'varchar', (col) => col.notNull())
      .addColumn('metric', 'varchar', (col) => col.notNull())
      .addColumn('rating', 'real', (col) => col.notNull())
      .addColumn('explanation', 'varchar', (col) => col.notNull())
      .execute()
    await db.schema
      .createTable('sub_state')
      .addColumn('service', 'varchar', (col) => col.primaryKey())
      .addColumn('cursor', 'integer', (col) => col.notNull())
      .execute()
  },
  async down(db: Kysely<any>) {
    await db.schema.dropTable('post').execute()
    await db.schema.dropTable('sub_state').execute()
  },
}

migrations['002'] = {
  async up(db: Kysely<any>) {
    await db.schema
      .createTable('rule')
      .addColumn('feed', 'varchar', (col) => col.primaryKey())
      .addColumn('includeAuthor', 'varchar')
      .addColumn('excludeAuthor', 'varchar')
      .addColumn('includeText', 'varchar')
      .addColumn('excludeText', 'varchar')
      .addColumn('includeLang', 'varchar')
      .addColumn('excludeLang', 'varchar')
      .execute()
  },
  async down(db: Kysely<any>) {
    await db.schema.dropTable('rule').execute()
  },
}

migrations['003'] = {
  async up(db: Kysely<any>) {
    await db
      .insertInto('rule')
      .values({
        feed: 'whats-llm',
        includeAuthor: null,
        // did:plc:xxno7p4xtpkxtn4ok6prtlcb  lovefairy.nl // cspell:disable-line
        // did:plc:jf3oraummcsfodflx5w5pouf  arxiv-cs-cl.bsky.social // cspell:disable-line
        // did:plc:mcb6n67plnrlx4lg35natk2b  nowbreezing.ntw.app // cspell:disable-line
        excludeAuthor: 'did:plc:xxno7p4xtpkxtn4ok6prtlcb|did:plc:jf3oraummcsfodflx5w5pouf|did:plc:mcb6n67plnrlx4lg35natk2b', // cspell:disable-line
        includeText:
          '\\bLLMs?\\b|language model|言語モデル|foundation model|transformer model|transformer architecture|self[-\\s]attention|gpt[-\\s]?4|gpt[-\\s]?3\\.5|\\banthropic\\b|llama[-\\s]2|Stable\\s?Beluga|vicuna|guanaco|wizardlm|airoboros|qlora|ggml|gptq|llama\\.cpp|fastchat|gpt4all|langchain|llama[_\\s]?index|autogpt|babyagi',
        excludeText: 'Summary by GPT|chat\\s?gpt',
        includeLang: 'en|ja|unknown',
        excludeLang: null,
      })
      .execute()

    await db
      .insertInto('rule')
      .values({
        feed: 'whats-chatgpt',
        includeAuthor: null,
        excludeAuthor: null,
        includeText: 'chat\\s?gpt',
        excludeText: null,
        includeLang: 'en|ja|unknown',
        excludeLang: null,
      })
      .execute()

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
    await db
      .insertInto('rule')
      .values({
        feed: 'tech-news',
        includeAuthor:
          'did:plc:7dh44snmqoa4gyzv3652gm3j|did:plc:apeaukvxm3yedgqw5zcf5pwc|did:plc:eidn2o5kwuaqcss7zo7ivye5|did:plc:ppuqidjyabv5iwzeoxt4fq5o|did:plc:tlhqo7uw5d3rcohosg3io7t5|did:plc:vtpyqvwce4x6gpa5dcizqecy|did:plc:z5xxhxqv6elnjzulyf7t22wk|did:plc:pv7fudnt4dspurzdnyq73pfe', // cspell:disable-line
        excludeAuthor: null,
        includeText: null,
        excludeText: null,
        includeLang: null,
        excludeLang: null,
      })
      .execute()
  },
  async down(db: Kysely<any>) {
    await db.deleteFrom('rule').where('feed', '=', 'whats-llm').execute()
    await db.deleteFrom('rule').where('feed', '=', 'whats-chatgpt').execute()
    await db.deleteFrom('rule').where('feed', '=', 'tech-news').execute()
  },
}
