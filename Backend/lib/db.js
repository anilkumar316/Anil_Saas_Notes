const clientPromise = require('./mongodb');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

async function seedDatabase(db) {
    const userCount = await db.collection('users').countDocuments();
    if (userCount === 0) {
        console.log('No users found. Seeding database...');
        await db.collection('tenants').insertMany([
            { _id: 'acme', name: 'Acme Inc.', plan: 'free' },
            { _id: 'globex', name: 'Globex Corporation', plan: 'pro' },
        ]);
        const hashedPassword = bcrypt.hashSync('password', 10);
        await db.collection('users').insertMany([
             { email: 'admin@acme.test', password: hashedPassword, role: 'Admin', tenantId: 'acme' },
             { email: 'user@acme.test', password: hashedPassword, role: 'Member', tenantId: 'acme' },
             { email: 'admin@globex.test', password: hashedPassword, role: 'Admin', tenantId: 'globex' },
             { email: 'user@globex.test', password: hashedPassword, role: 'Member', tenantId: 'globex' },
        ]);
        const acmeAdmin = await db.collection('users').findOne({ email: 'admin@acme.test' });
        const globexAdmin = await db.collection('users').findOne({ email: 'admin@globex.test' });
        await db.collection('notes').insertMany([
            { content: 'Acme initial note.', userId: acmeAdmin._id, tenantId: 'acme', createdAt: new Date() },
            { content: 'Globex meeting minutes.', userId: globexAdmin._id, tenantId: 'globex', createdAt: new Date() },
        ]);
        console.log('Database seeded successfully.');
    }
}

let dbInstance;
async function getDb() {
    if (dbInstance) return dbInstance;
    const client = await clientPromise;
    const db = client.db();
    await seedDatabase(db);
    dbInstance = db;
    return db;
}

module.exports = {
    tenants: {
        find: async (slug) => {
            const db = await getDb();
            return db.collection('tenants').findOne({ _id: slug });
        },
        upgrade: async (slug) => {
            const db = await getDb();
            const result = await db.collection('tenants').updateOne({ _id: slug }, { $set: { plan: 'pro' } });
            return result.modifiedCount > 0 ? db.collection('tenants').findOne({_id: slug}) : null;
        }
    },
    users: {
        findByEmail: async (email) => {
            const db = await getDb();
            return db.collection('users').findOne({ email });
        },
    },
    notes: {
        findByTenant: async (tenantId) => {
            const db = await getDb();
            return db.collection('notes').find({ tenantId }).toArray();
        },
        findById: async (id) => {
             const db = await getDb();
             if (!ObjectId.isValid(id)) return null;
             return db.collection('notes').findOne({ _id: new ObjectId(id) });
        },
        countByTenant: async (tenantId) => {
            const db = await getDb();
            return db.collection('notes').countDocuments({ tenantId });
        },
        create: async (data) => {
            const db = await getDb();
            const newNote = { ...data, userId: new ObjectId(data.userId), createdAt: new Date() };
            const result = await db.collection('notes').insertOne(newNote);
            return { ...newNote, _id: result.insertedId };
        },
        delete: async (id) => {
            const db = await getDb();
            if (!ObjectId.isValid(id)) return false;
            const result = await db.collection('notes').deleteOne({ _id: new ObjectId(id) });
            return result.deletedCount > 0;
        },
        update: async (id, content) => {
             const db = await getDb();
             if (!ObjectId.isValid(id)) return null;
             await db.collection('notes').updateOne({ _id: new ObjectId(id) }, { $set: { content } });
             return db.collection('notes').findOne({ _id: new ObjectId(id) });
        }
    }
};