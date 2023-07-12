import { AppContext } from '../config'
import {
  QueryParams,
  OutputSchema as AlgoOutput,
} from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import * as whatsLlm from './whats-llm'
import * as whatsLlmRaw from './whats-llm-raw'
import * as whatsGpt from './whats-gpt'
import * as whatsGenAi from './whats-gen-ai'

type AlgoHandler = (ctx: AppContext, params: QueryParams) => Promise<AlgoOutput>

const algos: Record<string, AlgoHandler> = {
  [whatsLlm.shortname]: whatsLlm.handler,
  [whatsLlmRaw.shortname]: whatsLlmRaw.handler,
  [whatsGpt.shortname]: whatsGpt.handler,
  [whatsGenAi.shortname]: whatsGenAi.handler,
}

export default algos
