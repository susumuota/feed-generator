import dotenv from 'dotenv'
import { createDb } from '../src/db'
import { Configuration, CreateChatCompletionRequest, OpenAIApi } from 'openai'

const RATINGS = [
  {
    feed: 'whats-llm',
    limit: 1, // API will be called {limit} times per minute
    target: 'AI researchers',
    feature: 'informative',
  },
]

const INTERVAL_MS = 1000 * 60 // run() will be called every minute

const getPosts = async (feed: string, metric: string, limit: number) =>
  createDb(process.env.FEEDGEN_SQLITE_LOCATION ?? ':memory:')
    .selectFrom('post')
    .selectAll()
    .where('feed', '=', feed)
    .where('metric', '=', metric)
    .orderBy('indexedAt', 'desc')
    .orderBy('cid', 'desc')
    .limit(limit)
    .execute()

const updatePost = async (
  uri: string,
  metric: string,
  rating: number,
  explanation: string,
) =>
  createDb(process.env.FEEDGEN_SQLITE_LOCATION ?? ':memory:')
    .updateTable('post')
    .set({ metric, rating, explanation })
    .where('uri', '=', uri)
    .execute()

const insertLlmUsage = async (
  uri: string,
  cid: string,
  promptTokens: number,
  completionTokens: number,
  totalTokens: number,
) =>
  createDb(process.env.FEEDGEN_SQLITE_LOCATION ?? ':memory:')
    .insertInto('llm_usage')
    .values({
      uri,
      cid,
      indexedAt: new Date().toISOString(),
      promptTokens,
      completionTokens,
      totalTokens,
    })
    .onConflict((oc) => oc.doNothing())
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

    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })
    const openai = new OpenAIApi(configuration)

    RATINGS.forEach(async ({ feed, limit, target, feature }) => {
      const posts = await getPosts(feed, 'RegExp', limit) // get only 'RegExp' posts

      posts.forEach(async (post) => {
        console.log({ post })

        const params = createChatCompletionParams(target, feature, post.text)
        const completion = await openai.createChatCompletion(params)
        const args = JSON.parse(
          completion.data.choices?.[0]?.message?.function_call?.arguments ??
            '{}',
        )
        console.log({ args })

        insertLlmUsage(
          post.uri,
          post.cid,
          completion.data.usage?.prompt_tokens ?? 0,
          completion.data.usage?.completion_tokens ?? 0,
          completion.data.usage?.total_tokens ?? 0,
        )

        const results = await updatePost(
          post.uri,
          `${feature} for ${target}`, // previously 'RegExp'. update it so that it won't be selected again
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

// loop forever
setInterval(run, INTERVAL_MS)
