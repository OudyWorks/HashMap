import {
  $before,
  $after,
  default as HashMap
} from '@oudy/hashmap'
import {
  $validateContext,
  $pluralName,
  $context
} from '@oudy/entity'
import RedisBatch from '@oudy/redis/batch'

const $client = Symbol('client'),
  $key = Symbol('key')

class RedisHashMap extends HashMap {
  static use(Entity, keys = []) {
    super.use(Entity, keys)
    Entity[$client] = Entity[$client] || function () {
      return 'default'
    }
    Entity[$key] = Entity[$key] || function (key = 'id', context = {}) {
      return this[$context].map(
        key =>
          `${key}:${context[key]}`

      ).concat(this[$pluralName]().toLowerCase(), key).join(':')
    }
    Entity.isExistInHashMap = function (key, value, context = {}) {
      return this[$validateContext](context).then(
        context => {
          let CLIENT = this[$client](context),
            KEY = this[$key](key, context)
          return RedisBatch[key == 'id' ? 'sismember' : 'hget'](KEY, value, CLIENT)
        }
      )
    }
    if (keys.includes('id'))
      Entity.on(
        'new',
        bind => {
          let KEY = Entity[$key]('id', bind.context),
            CLIENT = Entity[$client](bind.context)
          RedisBatch.sadd(
            KEY,
            `${bind.id}`,
            CLIENT
          )
        }
      )
    if (keys.find(key => key != 'id'))
      Entity.on(
        'save',
        bind => {
          keys.filter(key => key != 'id').forEach(
            async key => {
              const KEY = Entity[$key](key, bind.context),
                CLIENT = Entity[$client](bind.context),
                before = RedisHashMap.getKeyFromObject(bind[$before], key),
                after = RedisHashMap.getKeyFromObject(bind[$after], key)
              if (bind.changes.includes(key) || before != after) {
                if (before)
                  await RedisBatch.hdel(
                    KEY,
                    before,
                    CLIENT
                  )
                if (after)
                  await RedisBatch.hset(
                    KEY,
                    after,
                    `${bind.id}`,
                    CLIENT
                  )
              }
            }
          )

        }
      )
  }
}

export {
  $client,
  $key
}

export default RedisHashMap