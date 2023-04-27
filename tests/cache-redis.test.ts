import mongoose, { model } from 'mongoose'
import CacheMongoose from '../src/plugin'

import UserSchema from './schemas/UserSchema'

describe('cache redis', () => {
  const uri = `${globalThis.__MONGO_URI__}${globalThis.__MONGO_DB_NAME__}`
  const User = model('User', UserSchema)

  const cache = CacheMongoose.init(mongoose, {
    engine: 'redis',
    engineOptions: {
      host: 'localhost',
      port: 6379
    },
    defaultTTL: '6 minutes'
  })

  beforeAll(async () => {
    await mongoose.connect(uri)
  })

  afterAll(async () => {
    await mongoose.connection.close()
    await cache.close()
  })

  beforeEach(async () => {
    await mongoose.connection.collection('users').deleteMany({})
  })

  describe('memory scenarios', () => {
    it('should use memory cache', async () => {
      const user = await User.create({
        name: 'John Doe',
        role: 'admin'
      })

      const user1 = await User.findById(user._id).cache()
      await User.findOneAndUpdate({ _id: user._id }, { name: 'John Doe 2' })
      const user2 = await User.findById(user._id).cache()

      expect(user1).not.toBeNull()
      expect(user2).not.toBeNull()
      expect(user1?._id).toEqual(user2?._id)
      expect(user1?.name).toEqual(user2?.name)
    })

    it('should not use cache', async () => {
      const user = await User.create({
        name: 'John Doe',
        role: 'admin'
      })

      const cache1 = await User.findById(user._id).cache().exec()
      await User.findByIdAndUpdate(user._id, { name: 'John Doe 2' })
      await cache.clear()
      const cache2 = await User.findById(user._id).cache().exec()

      expect(cache1).not.toBeNull()
      expect(cache2).not.toBeNull()
      expect(cache1?._id).toEqual(cache2?._id)
      expect(cache1?.name).not.toEqual(cache2?.name)
    })

    it('should use memory cache with custom key', async () => {
      const user = await User.create({
        name: 'John Doe',
        role: 'admin'
      })

      const cache1 = await User.findById(user._id).cache('1 minute', 'test-custom-key').exec()
      await User.findOneAndUpdate({ _id: user._id }, { name: 'John Doe 2' })
      const cache2 = await User.findById(user._id).cache('1 minute', 'test-custom-key').exec()

      expect(cache1).not.toBeNull()
      expect(cache2).not.toBeNull()
      expect(cache1?._id).toEqual(cache2?._id)
      expect(cache1?.name).toEqual(cache2?.name)
    })

    it('should use memory cache and clear custom key', async () => {
      const user = await User.create({
        name: 'John Doe',
        role: 'admin'
      })

      const cache1 = await User.findById(user._id).cache('1 minute', 'test-custom-key-second').exec()
      await User.updateOne({ _id: user._id }, { name: 'John Doe 2' })
      await cache.clear('test-custom-key-second')
      const cache2 = await User.findById(user._id).cache('1 minute', 'test-custom-key-second').exec()

      expect(cache1).not.toBeNull()
      expect(cache2).not.toBeNull()
      expect(cache1?._id).toEqual(cache2?._id)
      expect(cache1?.name).not.toEqual(cache2?.name)
    })
  })

  it('should use redis cache', async () => {
    expect(cache).toBeDefined()

    const user = await User.create({
      name: 'John Doe',
      role: 'admin'
    })

    const cache1 = await User.findById(user._id).cache()
    await User.updateOne({ _id: user._id }, { name: 'John Doe 2' })
    const cache2 = await User.findById(user._id).cache()

    expect(cache1).not.toBeNull()
    expect(cache2).not.toBeNull()
    expect(cache1?._id).toEqual(cache2?._id)
    expect(cache1?.name).toEqual(cache2?.name)

    await User.create([
      {
        name: 'John Doe 3',
        role: 'admin'
      },
      {
        name: 'John Doe 4',
        role: 'admin'
      }
    ])

    const cache3 = await User.find({ role: 'admin' }).cache()
    await User.updateMany({ role: 'admin' }, { name: 'John Doe 5' })
    const cache4 = await User.find({ role: 'admin' }).cache()

    expect(cache3).not.toBeNull()
    expect(cache4).not.toBeNull()
    expect(cache3?.length).toEqual(cache4?.length)
    expect(cache3?.[0].name).toEqual(cache4?.[0].name)
  })

  it('should use redis cache and aggregate', async () => {
    await User.create([
      { name: 'John', role: 'admin' },
      { name: 'Bob', role: 'admin' },
      { name: 'Alice', role: 'user' }
    ])

    const cache1 = await User.aggregate([
      { $match: { role: 'admin' } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]).cache('1 minute')

    await User.create({ name: 'Mark', role: 'admin' })

    const cache2 = await User.aggregate([
      { $match: { role: 'admin' } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]).cache('1 minute')

    expect(cache1).not.toBeNull()
    expect(cache2).not.toBeNull()
    expect(cache1?.[0].count).toEqual(cache2?.[0].count)
  })
})
