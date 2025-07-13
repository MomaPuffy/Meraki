import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
let client: MongoClient;

if (!globalThis._mongoClientPromise) {
  client = new MongoClient(uri);
  globalThis._mongoClientPromise = client.connect();
}

const clientPromise = globalThis._mongoClientPromise;

export default clientPromise;
