import { AppContext } from '../config'
import {
  QueryParams,
  OutputSchema as AlgoOutput,
} from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import * as whatsLlm from './whats-llm'
import * as whatsLlmRaw from './whats-llm-raw'
import * as whatsChatgpt from './whats-chatgpt'
import * as techNews from './tech-news'

type AlgoHandler = (ctx: AppContext, params: QueryParams) => Promise<AlgoOutput>

const algos: Record<string, AlgoHandler> = {
  [whatsLlm.shortname]: whatsLlm.handler,
  [whatsLlmRaw.shortname]: whatsLlmRaw.handler,
  [whatsChatgpt.shortname]: whatsChatgpt.handler,
  [techNews.shortname]: techNews.handler,
}

export default algos
