import { AppContext } from '../config'
import {
  QueryParams,
  OutputSchema as AlgoOutput,
} from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import * as whatsLlm from './whats-llm'
import * as whatsGpt from './whats-gpt'

type AlgoHandler = (ctx: AppContext, params: QueryParams) => Promise<AlgoOutput>

const algos: Record<string, AlgoHandler> = {
  [whatsLlm.shortname]: whatsLlm.handler,
  [whatsGpt.shortname]: whatsGpt.handler,
}

export default algos
