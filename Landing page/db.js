import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlitePath = path.join(__dirname, 'data', 'petverz.db');

mkdirSync(path.dirname(sqlitePath), { recursive: true });

const entryFields = 'id, full_name, email, phone, pet_type, city, created_at, updated_at';
const collectionName = 'early_access_signups';

function toEntryRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    pet_type: row.pet_type,
    city: row.city,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function createSqliteStorage() {
  const database = new Database(sqlitePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.pragma('busy_timeout = 5000');

  database.exec(`
    CREATE TABLE IF NOT EXISTS early_access_signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      pet_type TEXT NOT NULL,
      city TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_early_access_created_at
      ON early_access_signups(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_early_access_city
      ON early_access_signups(city);
  `);

  return {
    mode: 'sqlite',
    async getStats() {
      const row = database.prepare('SELECT COUNT(*) AS count FROM early_access_signups').get();
      return { count: row.count };
    },
    async listEntries(limit = 500) {
      const entries = database.prepare(`
        SELECT ${entryFields}
        FROM early_access_signups
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT ?
      `).all(limit);

      return entries.map(toEntryRow);
    },
    async findEntryByEmail(email) {
      return toEntryRow(
        database.prepare(`SELECT ${entryFields} FROM early_access_signups WHERE email = ?`).get(email)
      );
    },
    async findEntryById(id) {
      return toEntryRow(
        database.prepare(`SELECT ${entryFields} FROM early_access_signups WHERE id = ?`).get(id)
      );
    },
    async createEntry(entry) {
      const result = database.prepare(`
        INSERT INTO early_access_signups (full_name, email, phone, pet_type, city)
        VALUES (?, ?, ?, ?, ?)
      `).run(entry.full_name, entry.email, entry.phone, entry.pet_type, entry.city);

      return this.findEntryById(result.lastInsertRowid);
    },
    async updateEntryByEmail(email, entry) {
      const result = database.prepare(`
        UPDATE early_access_signups
        SET full_name = ?, phone = ?, pet_type = ?, city = ?, updated_at = datetime('now')
        WHERE email = ?
      `).run(entry.full_name, entry.phone, entry.pet_type, entry.city, email);

      return {
        changes: result.changes,
        saved: await this.findEntryByEmail(email)
      };
    },
    async close() {
      database.close();
    }
  };
}

function createMongoStorage(connectionString, dbName = 'petverz') {
  const client = new MongoClient(connectionString, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10
  });

  let database;
  let collection;

  const ensureSchema = async () => {
    await client.connect();
    database = client.db(dbName);
    collection = database.collection(collectionName);

    await collection.createIndex({ email: 1 }, { unique: true, name: 'uniq_email' });
    await collection.createIndex({ created_at: -1 }, { name: 'idx_created_at' });
    await collection.createIndex({ city: 1 }, { name: 'idx_city' });
  };

  const ensureReady = async () => {
    if (!collection) {
      await ensureSchema();
    }
    return collection;
  };

  return {
    mode: 'mongodb',
    async init() {
      await ensureSchema();
    },
    async getStats() {
      const currentCollection = await ensureReady();
      const count = await currentCollection.countDocuments({});
      return { count };
    },
    async listEntries(limit = 500) {
      const currentCollection = await ensureReady();
      const entries = await currentCollection
        .find({})
        .sort({ created_at: -1, _id: -1 })
        .limit(limit)
        .toArray();

      return entries.map((entry) => toEntryRow({
        id: entry._id.toString(),
        full_name: entry.full_name,
        email: entry.email,
        phone: entry.phone,
        pet_type: entry.pet_type,
        city: entry.city,
        created_at: entry.created_at instanceof Date ? entry.created_at.toISOString() : entry.created_at,
        updated_at: entry.updated_at instanceof Date ? entry.updated_at.toISOString() : entry.updated_at
      }));
    },
    async findEntryByEmail(email) {
      const currentCollection = await ensureReady();
      const entry = await currentCollection.findOne({ email });
      if (!entry) {
        return null;
      }

      return toEntryRow({
        id: entry._id.toString(),
        full_name: entry.full_name,
        email: entry.email,
        phone: entry.phone,
        pet_type: entry.pet_type,
        city: entry.city,
        created_at: entry.created_at instanceof Date ? entry.created_at.toISOString() : entry.created_at,
        updated_at: entry.updated_at instanceof Date ? entry.updated_at.toISOString() : entry.updated_at
      });
    },
    async findEntryById(id) {
      const currentCollection = await ensureReady();
      const { ObjectId } = await import('mongodb');
      const entry = await currentCollection.findOne({ _id: new ObjectId(String(id)) });
      if (!entry) {
        return null;
      }

      return toEntryRow({
        id: entry._id.toString(),
        full_name: entry.full_name,
        email: entry.email,
        phone: entry.phone,
        pet_type: entry.pet_type,
        city: entry.city,
        created_at: entry.created_at instanceof Date ? entry.created_at.toISOString() : entry.created_at,
        updated_at: entry.updated_at instanceof Date ? entry.updated_at.toISOString() : entry.updated_at
      });
    },
    async createEntry(entry) {
      const currentCollection = await ensureReady();
      const now = new Date();
      const result = await currentCollection.insertOne({
        full_name: entry.full_name,
        email: entry.email,
        phone: entry.phone,
        pet_type: entry.pet_type,
        city: entry.city,
        created_at: now,
        updated_at: now
      });

      return this.findEntryById(result.insertedId);
    },
    async updateEntryByEmail(email, entry) {
      const currentCollection = await ensureReady();
      const now = new Date();
      const result = await currentCollection.updateOne(
        { email },
        {
          $set: {
            full_name: entry.full_name,
            phone: entry.phone,
            pet_type: entry.pet_type,
            city: entry.city,
            updated_at: now
          }
        }
      );

      return {
        changes: result.modifiedCount,
        saved: await this.findEntryByEmail(email)
      };
    },
    async close() {
      await client.close();
    }
  };
}

export function createStorage() {
  const connectionString = process.env.MONGODB_URI;

  if (connectionString) {
    return createMongoStorage(connectionString, process.env.MONGODB_DB_NAME || 'petverz');
  }

  return createSqliteStorage();
}