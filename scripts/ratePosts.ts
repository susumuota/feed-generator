import dotenv from 'dotenv'
import { BskyAgent } from '@atproto/api'
import { AtUri } from '@atproto/uri'
import { Configuration, CreateChatCompletionRequest, OpenAIApi } from 'openai'
import { createDb, Database } from '../src/db'

const RATINGS = [
  {
    feed: 'whats-llm',
    limit: 1, // API will be called {limit} times per minute
    target: 'AI researchers',
    feature: 'informative',
  },
]

const getPosts = async (
  db: Database,
  feed: string,
  metric: string,
  limit: number,
) =>
  db
    .selectFrom('post')
    .selectAll()
    .where('feed', '=', feed)
    .where('metric', '=', metric)
    .orderBy('indexedAt', 'desc')
    .orderBy('cid', 'desc')
    .limit(limit)
    .execute()

const updatePost = async (
  db: Database,
  uri: string,
  metric: string,
  rating: number,
  explanation: string,
) =>
  db
    .updateTable('post')
    .set({ metric, rating, explanation })
    .where('uri', '=', uri)
    .execute()

const createChatCompletionParams = (
  target: string,
  feature: string,
  text: string,
): CreateChatCompletionRequest => ({
  model: 'gpt-3.5-turbo',
  messages: [
    {
      role: 'system',
      content:
        `Your task is to filter ${feature} tweets for ${target}.` +
        ` Please rate the given tweet on a scale of 1 to 10 for ${target}, ` +
        ` where 1 represents "Not ${feature} at all" and 10 represents "Very ${feature}".` +
        ' Provide a brief explanation for your rating.',
    },
    {
      role: 'user',
      content: `Rate this tweet: \n\n\`\`\`\n${text}\n\`\`\``,
    },
  ],
  functions: [
    {
      name: 'set_rating',
      parameters: {
        type: 'object',
        properties: {
          rating: { type: 'number' },
          explanation: { type: 'string' },
        },
        required: ['rating', 'explanation'],
      },
    },
  ],
  function_call: { name: 'set_rating' },
})

const run = async () => {
  try {
    dotenv.config()

    const db = createDb(process.env.FEEDGEN_SQLITE_LOCATION ?? ':memory:')

    const agent = new BskyAgent({ service: 'https://bsky.social' })

    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })
    const openai = new OpenAIApi(configuration)

    RATINGS.forEach(async ({ feed, limit, target, feature }) => {
      const posts = await getPosts(db, feed, 'rule', limit) // get only 'rule' posts

      posts.forEach(async (post) => {
        console.log({ post })

        const u = new AtUri(post.uri)
        const p = await agent.getPost({
          repo: u.hostname,
          rkey: u.rkey,
          cid: post.cid,
        })
        const text = p?.value?.text ?? ''
        console.log({ text })

        const params = createChatCompletionParams(target, feature, text)
        const c = await openai.createChatCompletion(params)
        const args = JSON.parse(
          c.data.choices?.[0]?.message?.function_call?.arguments ?? '{}',
        )
        console.log({ args })

        const results = await updatePost(
          db,
          post.uri,
          `${feature} for ${target}`,
          args?.rating ?? 0, // TODO: if rating is not provided, what should we do? post.rating?
          args?.explanation ?? 'Error: No explanation provided',
        )
        console.log({ results })
      })
    })
  } catch (err: any) {
    console.error(err)
  }
}

run()
