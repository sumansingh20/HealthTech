import { MongoClient, type Db } from 'mongodb';
import { getMongoDbUri } from '@icu/config';

let _client: MongoClient | null = null;
let _db: Db | null = null;

function extractDatabaseName(uri: string): string {
  const m = uri.match(/\/([^/?]+)(\?|$)/);
  return m?.[1] ?? 'icu';
}

export async function getMongoDb(): Promise<Db> {
  if (_db) return _db;
  const uri = getMongoDbUri();
  if (!uri) throw new Error('MONGODB_ATLAS_URI or MONGODB_URI must be set');

  _client = new MongoClient(uri, { maxPoolSize: 10 });
  await _client.connect();
  const dbName = extractDatabaseName(uri);
  _db = _client.db(dbName);
  return _db;
}

export async function closeMongo(): Promise<void> {
  if (_client) {
    await _client.close();
    _client = null;
    _db = null;
  }
}

export function getClientIfExists(): MongoClient | null {
  return _client;
}
