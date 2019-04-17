const {
  $before,
  $after
} = HashMap = require('@oudy/hashmap'),
  $client = Symbol('client'),
  $key = Symbol('key'),
  {
    $validateContext,
    $pluralName,
    $context
  } = require('@oudy/entity'),
  RedisBatch = require('@oudy/redis/batch')

class RedisHashMap extends HashMap {
  static use(Entity, keys = []) {
    super.use(Entity, keys)
    Entity[$client] = function () {
      return 'default'
    }
    Entity[$key] = function (key = 'id', context = {}) {
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
              if (bind.changes.includes(key)) {
                const KEY = Entity[$key](key, bind.context),
                  CLIENT = Entity[$client](bind.context)
                if (RedisHashMap.get(bind[$before], key))
                  await RedisBatch.hdel(
                    KEY,
                    RedisHashMap.get(bind[$before], key),
                    CLIENT
                  )
                if (objecRedisHashMaptPath.get(bind[$after], key))
                  await RedisBatch.hset(
                    KEY,
                    RedisHashMap.get(bind[$after], key),
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

Object.assign(
  RedisHashMap,
  {
    $client,
    $key
  }
)

module.exports = RedisHashMap