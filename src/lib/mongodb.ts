import { MongoClient, type MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI;
const options: MongoClientOptions = {};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to your environment (see .env.example)."
    );
  }
  return new MongoClient(uri, options).connect();
}

/**
 * A cached `MongoClient` connection promise. Used by the NextAuth
 * MongoDB adapter and any other code that needs raw driver access.
 */
const clientPromise: Promise<MongoClient> =
  global._mongoClientPromise ?? (global._mongoClientPromise = createClientPromise());

export default clientPromise;
