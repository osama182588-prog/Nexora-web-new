import mongoose, { type Mongoose } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache =
  global._mongooseCache ?? (global._mongooseCache = { conn: null, promise: null });

/**
 * Lazily connect to MongoDB and cache the connection across HMR reloads
 * and serverless invocations to avoid exhausting the connection pool.
 */
export async function connectToDatabase(): Promise<Mongoose> {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Add it to your environment (see .env.example)."
    );
  }

  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      // Pool sized for serverless burst: a small idle minimum keeps
      // warm connections ready, the cap protects the cluster from a
      // thundering herd. `serverSelectionTimeoutMS` makes the driver
      // fail fast on a network blip instead of hanging the request.
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 8_000,
      socketTimeoutMS: 45_000
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
