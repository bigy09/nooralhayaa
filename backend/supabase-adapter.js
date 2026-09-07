import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'

const FIELD_MAP = {
  _id: 'id',
  preferredLocation: 'preferred_location',
  passwordHash: 'password_hash',
  refreshSessions: 'refresh_sessions',
  categorySlug: 'category_slug',
  comparePrice: 'compare_price',
  isVisible: 'is_visible',
  isOutOfStock: 'is_out_of_stock',
  categoryIds: 'category_ids',
  parent: 'parent_id',
  order: 'sort_order',
  sortOrder: 'sort_order',
  paymentAmount: 'payment_amount',
  paymentChoice: 'payment_choice',
  remainingAtDelivery: 'remaining_at_delivery',
  paidAmount: 'paid_amount',
  transactionReference: 'transaction_reference',
  inventoryReserved: 'inventory_reserved',
  sessionId: 'session_id',
  orderNumber: 'order_number',
  userId: 'user_id',
  deliveryZone: 'delivery_zone',
  actorId: 'actor_id',
  actorEmail: 'actor_email',
  actorRole: 'actor_role',
  targetType: 'target_type',
  targetId: 'target_id',
  userAgent: 'user_agent',
  viewDate: 'view_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

const REVERSE_FIELD_MAP = Object.fromEntries(Object.entries(FIELD_MAP).map(([key, value]) => [value, key]))

function fromRow(row, client, table) {
  if (!row) return row
  const result = {}
  for (const [key, value] of Object.entries(row)) {
    const mapped = REVERSE_FIELD_MAP[key] || key
    result[mapped] = value
  }
  result._id = result._id || row.id
  result.toObject = () => ({ ...result, toObject: undefined })
  result.save = async () => {
    const { data, error } = await client.from(table).update(toRow(result)).eq('id', result._id).select('*').single()
    if (error) throw error
    return fromRow(data, client, table)
  }
  return result
}

function toRow(data) {
  const row = {}
  for (const [key, value] of Object.entries(data || {})) {
    if (key === '__mockStoreKey' || key === 'toObject' || key === 'save') continue
    row[FIELD_MAP[key] || key] = value
  }
  if (row.id === undefined) delete row.id
  return row
}

function applyUpdate(document, update) {
  if (update.$set) Object.assign(document, update.$set)
  if (update.$pull) {
    for (const [key, query] of Object.entries(update.$pull)) {
      if (!Array.isArray(document[key])) continue
      document[key] = document[key].filter((item) => !Object.entries(query).every(([field, expected]) => String(item[field]) === String(expected)))
    }
  }
  if (update.$push) {
    for (const [key, value] of Object.entries(update.$push)) document[key] = [...(document[key] || []), value]
  }
  if (update.$inc) {
    for (const [key, value] of Object.entries(update.$inc)) document[key] = (Number(document[key]) || 0) + value
  }
  for (const [key, value] of Object.entries(update)) if (!key.startsWith('$')) document[key] = value
  return document
}

function nestedValue(record, path) {
  if (path === 'id' || path === '_id') return record._id || record.id
  return path.split('.').reduce((current, key) => current?.[key], record)
}

function matches(record, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') return expected.some((item) => matches(record, item))
    const actual = nestedValue(record, REVERSE_FIELD_MAP[key] || key)
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if ('$ne' in expected && actual === expected.$ne) return false
      if ('$in' in expected && !expected.$in.map(String).includes(String(actual))) return false
      if ('$gte' in expected && !(actual >= expected.$gte)) return false
      if ('$lte' in expected && !(actual <= expected.$lte)) return false
      if ('$regex' in expected) {
        const regex = new RegExp(expected.$regex, expected.$options || '')
        if (!regex.test(String(actual || ''))) return false
      }
      return true
    }
    return String(actual) === String(expected)
  })
}

function createQuery(client, table, query = {}) {
  const state = { sort: null, skip: 0, limit: null, select: '*' }
  const chain = {
    sort(value) { state.sort = value; return chain },
    skip(value) { state.skip = Math.max(0, Number(value) || 0); return chain },
    limit(value) { state.limit = value; return chain },
    select(value) { state.select = value || '*'; return chain },
    populate() { return chain },
    lean() { return chain },
    async exec() {
      const { data, error } = await client.from(table).select('*')
      if (error) throw error
      let rows = (data || []).map((row) => fromRow(row, client, table)).filter((row) => matches(row, query))
      if (state.sort) {
        const [field, direction] = Object.entries(state.sort)[0] || []
        const mapped = REVERSE_FIELD_MAP[field] || field
        rows.sort((a, b) => (a[mapped] < b[mapped] ? (direction === -1 ? 1 : -1) : a[mapped] > b[mapped] ? (direction === -1 ? -1 : 1) : 0))
      }
      rows = state.limit == null ? rows.slice(state.skip) : rows.slice(state.skip, state.skip + state.limit)
      return rows
    },
    then(resolve, reject) { return chain.exec().then(resolve, reject) },
    catch(reject) { return chain.exec().catch(reject) },
  }
  return chain
}

function createModel(client, table) {
  return {
    find: (query = {}) => createQuery(client, table, query),
    findOne: async (query = {}) => (await createQuery(client, table, query).limit(1))[0] || null,
    findById: (id) => {
      const chain = createQuery(client, table, {})
      const originalExec = chain.exec
      chain.exec = async () => {
        const { data, error } = await client.from(table).select('*').eq('id', id).limit(1)
        if (error) throw error
        return (data || []).map((row) => fromRow(row, client, table))
      }
      chain.then = (resolve, reject) => chain.exec().then(resolve, reject)
      return chain
    },
    create: async (data) => {
      const { data: rows, error } = await client.from(table).insert(toRow(data)).select('*').single()
      if (error) throw error
      return fromRow(rows, client, table)
    },
    updateOne: async (query, update, options = {}) => {
      const current = await (query._id ? createQuery(client, table, { id: query._id }) : createQuery(client, table, query)).limit(1)
      if (!current[0]) {
        if (update?.$upsert === false) return null
        return createModel(client, table).create({ ...query, ...(update.$set || update) })
      }
      const document = applyUpdate({ ...current[0] }, update)
      const { data, error } = await client.from(table).update(toRow(document)).eq('id', current[0]._id).select('*').single()
      if (error) throw error
      return fromRow(data, client, table)
    },
    findByIdAndUpdate: async (id, update) => {
      const current = await createQuery(client, table, { id }).limit(1)
      if (!current[0]) return null
      const document = applyUpdate({ ...current[0] }, update)
      const { data, error } = await client.from(table).update(toRow(document)).eq('id', id).select('*').single()
      if (error) throw error
      return fromRow(data, client, table)
    },
    findOneAndUpdate: async (query, update) => {
      const current = await createQuery(client, table, query).limit(1)
      if (!current[0]) return null
      const document = applyUpdate({ ...current[0] }, update)
      const { data, error } = await client.from(table).update(toRow(document)).eq('id', current[0]._id).select('*').single()
      if (error) throw error
      return fromRow(data, client, table)
    },
    findByIdAndDelete: async (id) => {
      const current = await createQuery(client, table, { id }).limit(1)
      if (!current[0]) return null
      const { error } = await client.from(table).delete().eq('id', id)
      if (error) throw error
      return current[0]
    },
    countDocuments: async (query = {}) => (await createQuery(client, table, query)).length,
    deleteMany: async (query = {}) => {
      const rows = await createQuery(client, table, query)
      for (const row of rows) await client.from(table).delete().eq('id', row._id)
      return { deletedCount: rows.length }
    },
    aggregate: async () => [],
  }
}

export async function initializeSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket },
  })
  const { error } = await client.from('users').select('id').limit(1)
  if (error) throw new Error(`Supabase connection failed: ${error.message}`)

  return {
    User: createModel(client, 'users'),
    Product: createModel(client, 'products'),
    Category: createModel(client, 'categories'),
    Banner: createModel(client, 'banners'),
    Cart: createModel(client, 'carts'),
    Wishlist: createModel(client, 'wishlists'),
    Order: createModel(client, 'orders'),
    AuditLog: createModel(client, 'audit_logs'),
    PageView: createModel(client, 'page_views'),
  }
}