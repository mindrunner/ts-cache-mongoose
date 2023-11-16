import type { ClusterOptions, ClusterNode } from 'ioredis'
import { type RedisOptions } from 'ioredis'

interface ICacheOptions {
  engine: 'memory' | 'redis',
  engineOptions?: RedisOptions | ClusterOptions,
  startupNodes?: ClusterNode[],
  defaultTTL?: string
}

export default ICacheOptions
