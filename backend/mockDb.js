import fs from 'fs'
import path from 'path'

const DB_FILE = path.join(process.cwd(), 'db.json')

let store = {
  users: [],
  products: [],
  categories: [],
  banners: [],
  carts: {},
  wishlists: {},
  orders: [],
  pageviews: [],
}

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8')
      store = JSON.parse(data)
    }
  } catch (error) {
    console.warn('Failed to load db.json:', error.message)
  }
}

function flushStore(storeKey) {
  try {
    if (storeKey === 'carts' || storeKey === 'wishlists') {
      const flat = { ...store }
      flat.carts = store.carts
      flat.wishlists = store.wishlists
      fs.writeFileSync(DB_FILE, JSON.stringify(flat, null, 2))
      return
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2))
  } catch (error) {
    console.warn('Failed to save db.json:', error.message)
  }
}

function saveDb(storeKey) {
  flushStore(storeKey)
}

loadDb()

function getCollectionRecords(storeKey) {
  const collection = store[storeKey]
  if (Array.isArray(collection)) return collection
  return Object.values(collection || {})
}

function persistRecord(doc, storeKey) {
  if (storeKey === 'carts' || storeKey === 'wishlists') {
    const key = doc.sessionId || doc._id
    store[storeKey][key] = doc
    saveDb(storeKey)
    return doc
  }

  const collection = store[storeKey]
  const index = collection.findIndex((item) => String(item._id) === String(doc._id))
  if (index >= 0) collection[index] = doc
  else collection.push(doc)
  saveDb(storeKey)
  return doc
}

class MockDocument {
  constructor(data = {}) {
    Object.assign(this, data)
    this._id = this._id || String(Date.now())
    this.createdAt = this.createdAt || new Date().toISOString()
    this.updatedAt = this.updatedAt || new Date().toISOString()
    this.__mockStoreKey = null
  }

  async save() {
    persistRecord(this, this.__mockStoreKey)
    return this
  }
}

function toDocument(item, storeKey) {
  if (!item || typeof item !== 'object') return item

  const doc = Object.assign(Object.create(MockDocument.prototype), item)
  doc.__mockStoreKey = storeKey
  if (typeof doc.save !== 'function') {
    doc.save = async function save() {
      persistRecord(this, this.__mockStoreKey)
      return this
    }
  }
  return doc
}

function applyUpdate(doc, update) {
  if (!update || typeof update !== 'object' || Array.isArray(update)) return doc

  if (update.$set) {
    Object.assign(doc, update.$set)
  }

  if (update.$unset) {
    for (const key of Object.keys(update.$unset)) {
      delete doc[key]
    }
  }

  if (update.$inc) {
    for (const [key, value] of Object.entries(update.$inc)) {
      if (typeof doc[key] === 'number') doc[key] += value
    }
  }

  if (update.$push) {
    for (const [field, payload] of Object.entries(update.$push)) {
      const existing = Array.isArray(doc[field]) ? [...doc[field]] : []
      const values = payload && typeof payload === 'object' && payload.$each ? payload.$each : [payload]
      const next = [...existing, ...values]
      if (payload && typeof payload === 'object' && payload.$slice !== undefined) {
        const sliceValue = payload.$slice
        doc[field] = sliceValue < 0 ? next.slice(sliceValue) : next.slice(0, sliceValue)
      } else {
        doc[field] = next
      }
    }
  }

  if (update.$pull) {
    for (const [field, query] of Object.entries(update.$pull)) {
      if (!Array.isArray(doc[field])) continue
      doc[field] = doc[field].filter((item) => !matchQuery(item, query))
    }
  }

  for (const [key, value] of Object.entries(update)) {
    if (!key.startsWith('$')) {
      doc[key] = value
    }
  }

  doc.updatedAt = new Date().toISOString()
  return doc
}

function createQueryableCollection(_items, storeKey) {
  const buildResult = (query = {}, options = {}) => {
    let docs = [...getCollectionRecords(storeKey)]

    if (query && typeof query === 'object' && !Array.isArray(query)) {
      docs = docs.filter((doc) => matchQuery(doc, query))
    }

    if (options.sort) {
      const [sortField, sortOrder] = Object.entries(options.sort)[0] || []
      if (sortField) {
        docs.sort((a, b) => {
          const av = a[sortField] ?? ''
          const bv = b[sortField] ?? ''
          if (typeof av === 'number' && typeof bv === 'number') return sortOrder === -1 ? bv - av : av - bv
          if (av < bv) return sortOrder === -1 ? 1 : -1
          if (av > bv) return sortOrder === -1 ? -1 : 1
          return 0
        })
      }
    }

    if (options.limit) {
      docs = docs.slice(0, options.limit)
    }

    if (options.select) {
      docs = docs.map((doc) => {
        const selected = {}
        for (const field of Object.keys(options.select)) {
          if (options.select[field] === 1 && field in doc) selected[field] = doc[field]
        }
        return { ...doc, ...selected }
      })
    }

    return docs.map((doc) => toDocument(doc, storeKey))
  }

  const createChain = (query = {}) => {
    const chain = {
      _query: query,
      _sort: null,
      _limit: null,
      _select: null,
      sort(value) {
        chain._sort = value
        return chain
      },
      limit(value) {
        chain._limit = value
        return chain
      },
      select(value) {
        chain._select = value
        return chain
      },
      lean() {
        return chain
      },
      then(resolve, reject) {
        return chain.exec().then(resolve, reject)
      },
      catch(reject) {
        return chain.exec().catch(reject)
      },
      finally(callback) {
        return chain.exec().finally(callback)
      },
      async exec() {
        const options = {}
        if (chain._sort) options.sort = chain._sort
        if (chain._limit) options.limit = chain._limit
        if (chain._select) options.select = chain._select
        return buildResult(chain._query, options)
      },
    }
    return chain
  }

  return {
    find: (query = {}, options = {}) => {
      if (options && typeof options === 'object' && Object.keys(options).length) {
        return createChain(query).sort(options.sort || null).limit(options.limit || null).select(options.select || null)
      }
      return createChain(query)
    },
    findById: async (id) => {
      const record = getCollectionRecords(storeKey).find((doc) => String(doc._id) === String(id)) || null
      return record ? toDocument(record, storeKey) : null
    },
    findOne: async (query = {}) => buildResult(query)[0] || null,
    create: async (data) => {
      const doc = Object.assign(new MockDocument(data), data)
      doc._id = doc._id || String(Date.now())
      doc.createdAt = doc.createdAt || new Date().toISOString()
      doc.updatedAt = doc.updatedAt || new Date().toISOString()
      doc.__mockStoreKey = storeKey
      persistRecord(doc, storeKey)
      return toDocument(doc, storeKey)
    },
    updateOne: async (query, update) => {
      const doc = getCollectionRecords(storeKey).find((item) => matchQuery(item, query))
      if (!doc) {
        if (update?.$upsert !== false) {
          const created = Object.assign(new MockDocument({ ...query, ...((update && update.$set) || update), _id: String(Date.now()) }), { ...query, ...((update && update.$set) || update), _id: String(Date.now()) })
          created.__mockStoreKey = storeKey
          persistRecord(created, storeKey)
          return toDocument(created, storeKey)
        }
        return null
      }
      const current = toDocument(doc, storeKey)
      applyUpdate(current, update)
      persistRecord(current, storeKey)
      return current
    },
    findByIdAndUpdate: async (id, update, options = {}) => {
      const doc = getCollectionRecords(storeKey).find((item) => String(item._id) === String(id))
      if (!doc) return null
      const current = toDocument(doc, storeKey)
      applyUpdate(current, update)
      persistRecord(current, storeKey)
      return options.new === true ? current : current
    },
    findOneAndUpdate: async (query, update, options = {}) => {
      const doc = getCollectionRecords(storeKey).find((item) => matchQuery(item, query))
      if (!doc) {
        if (options.upsert) {
          const created = Object.assign(new MockDocument({ ...query, ...((update && update.$set) || update), _id: String(Date.now()) }), { ...query, ...((update && update.$set) || update), _id: String(Date.now()) })
          created.__mockStoreKey = storeKey
          persistRecord(created, storeKey)
          return toDocument(created, storeKey)
        }
        return null
      }
      const current = toDocument(doc, storeKey)
      applyUpdate(current, update)
      persistRecord(current, storeKey)
      return options.new === true ? current : current
    },
    deleteOne: async (query) => {
      const collection = store[storeKey]
      const index = getCollectionRecords(storeKey).findIndex((item) => matchQuery(item, query))
      if (index >= 0) {
        if (Array.isArray(collection)) collection.splice(index, 1)
        else {
          const key = Object.keys(collection)[index]
          delete collection[key]
        }
        saveDb(storeKey)
        return { deletedCount: 1 }
      }
      return { deletedCount: 0 }
    },
    deleteMany: async (query) => {
      const collection = store[storeKey]
      const before = getCollectionRecords(storeKey).length
      const filtered = getCollectionRecords(storeKey).filter((item) => !matchQuery(item, query))
      if (Array.isArray(collection)) {
        collection.splice(0, collection.length, ...filtered)
      } else {
        const next = {}
        for (const item of filtered) next[String(item._id)] = item
        Object.assign(collection, next)
      }
      saveDb(storeKey)
      return { deletedCount: before - filtered.length }
    },
  }
}

function createDocConstructor(storeKey, _collectionName) {
  return class MockDocument {
    constructor(data = {}) {
      Object.assign(this, data)
      this._id = this._id || String(Date.now())
      this.createdAt = this.createdAt || new Date().toISOString()
      this.updatedAt = this.updatedAt || new Date().toISOString()
      this.__mockStoreKey = storeKey
    }

    async save() {
      persistRecord(this, this.__mockStoreKey)
      return this
    }
  }
}

function addChainableMethods(target, storeKey) {
  const collection = createQueryableCollection(store[storeKey], storeKey)
  target.find = collection.find
  target.findOne = collection.findOne
  target.findById = collection.findById
  target.findByIdAndUpdate = collection.findByIdAndUpdate
  target.findOneAndUpdate = collection.findOneAndUpdate
  target.create = collection.create
  target.updateOne = collection.updateOne
  target.deleteOne = collection.deleteOne
  target.deleteMany = collection.deleteMany
  target.aggregate = async () => []
  target.countDocuments = async (query = {}) => (await collection.find(query)).length
  target.distinct = async () => []
  target.findOneAndDelete = async (query) => {
    const doc = getCollectionRecords(storeKey).find((item) => matchQuery(item, query))
    if (!doc) return null
    if (Array.isArray(store[storeKey])) {
      store[storeKey] = store[storeKey].filter((item) => !matchQuery(item, query))
    } else {
      const next = {}
      for (const entry of Object.values(store[storeKey])) {
        if (!matchQuery(entry, query)) next[String(entry._id)] = entry
      }
      store[storeKey] = next
    }
    saveDb(storeKey)
    return doc
  }
  target.findOneAndReplace = async (query, replacement) => {
    const index = getCollectionRecords(storeKey).findIndex((item) => matchQuery(item, query))
    if (index === -1) return null
    const collection = getCollectionRecords(storeKey)
    collection[index] = { ...collection[index], ...replacement, _id: collection[index]._id }
    if (Array.isArray(store[storeKey])) {
      store[storeKey][index] = collection[index]
    } else {
      const key = Object.keys(store[storeKey])[index]
      store[storeKey][key] = collection[index]
    }
    saveDb(storeKey)
    return collection[index]
  }
  target.populate = () => target
  target.select = () => target
  target.lean = () => target
  target.sort = () => target
  target.limit = () => target
  target.exec = async () => []
}

export const User = createDocConstructor('users', 'users')
export const Product = createDocConstructor('products', 'products')
export const Category = createDocConstructor('categories', 'categories')
export const Banner = createDocConstructor('banners', 'banners')
export const Cart = createDocConstructor('carts', 'carts')
export const Wishlist = createDocConstructor('wishlists', 'wishlists')
export const Order = createDocConstructor('orders', 'orders')
export const AuditLog = createDocConstructor('orders', 'orders')
export const PageView = createDocConstructor('pageviews', 'pageviews')

function initCollections() {
  addChainableMethods(User, 'users')
  addChainableMethods(Product, 'products')
  addChainableMethods(Category, 'categories')
  addChainableMethods(Banner, 'banners')
  addChainableMethods(Cart, 'carts')
  addChainableMethods(Wishlist, 'wishlists')
  addChainableMethods(Order, 'orders')
  addChainableMethods(AuditLog, 'orders')
  addChainableMethods(PageView, 'pageviews')
}

function compareValues(actual, expected) {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    if (expected.$in) return Array.isArray(expected.$in) ? expected.$in.includes(actual) : false
    if (expected.$exists !== undefined) return (actual !== undefined && actual !== null) === expected.$exists
    if (expected.$ne !== undefined) return actual !== expected.$ne
    if (expected.$gte !== undefined) return actual >= expected.$gte
    if (expected.$gt !== undefined) return actual > expected.$gt
    if (expected.$lte !== undefined) return actual <= expected.$lte
    if (expected.$lt !== undefined) return actual < expected.$lt
    return Object.entries(expected).every(([nestedKey, nestedValue]) => compareValues(actual, { [nestedKey]: nestedValue }))
  }
  return actual === expected
}

function matchQuery(obj, query) {
  if (!query || typeof query !== 'object' || Array.isArray(query)) return true
  if (query.$or) return query.$or.some((part) => matchQuery(obj, part))
  if (query.$and) return query.$and.every((part) => matchQuery(obj, part))

  for (const [key, value] of Object.entries(query)) {
    if (key === '$or' || key === '$and') continue
    const actual = obj[key]
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (!compareValues(actual, value)) return false
      continue
    }
    if (actual !== value) return false
  }
  return true
}

export async function connect() {
  loadDb()
  initCollections()
  console.log('✅ Mock Database initialized')
  return Promise.resolve()
}

initCollections()
