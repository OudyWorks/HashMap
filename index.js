const $fields = Symbol('fields'),
  $cache = Symbol('cache'),
  $before = Symbol('before'),
  $after = Symbol('after'),
  objectPath = require('object-path')

class HashMap {
  static setup(Entity) {
    const HashMap = this
    Entity.hashMap = function () {
      HashMap.use(this, Array.from(arguments))
    }
  }
  static use(Entity, keys = []) {
    const bind = Entity.prototype.bind
    Object.assign(
      Entity.prototype,
      {
        bind(state, trackChange = true, bindObject = {}) {
          bindObject[$before] = {}
          this.constructor[$fields].forEach(
            key =>
              bindObject[$before][key] = objectPath.get(this, key)
          )
          return bind.bind(this)(state, trackChange, bindObject).then(
            bindObject => {
              bindObject[$after] = {}
              this.constructor[$fields].forEach(
                key =>
                  bindObject[$after][key] = objectPath.get(this, key)
              )
              return bindObject
            }
          )
        }
      }
    )
    Entity.loadFromHashMap = function (key, value, context = {}) {
      return this.isExistInHashMap(key, value, context).then(
        id =>
          this.load(id, context)
      )
    }
    Entity[$cache] = true
    Entity[$fields] = keys
  }
}

Object.assign(
  HashMap,
  {
    $fields,
    $cache,
    $before,
    $after
  }
)

module.exports = HashMap