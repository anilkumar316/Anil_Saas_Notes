const { MongoClient } = require('mongodb');

// 1. Read the MongoDB connection string from your .env file
const uri = process.env.MONGODB_URI;
const options = {};

// If the connection string is missing, stop the application
if (!uri) {
  throw new Error('Please add your Mongo URI to the .env file');
}

let client;
let clientPromise;

// This logic ensures that in a development environment, you don't create a new 
// connection every time the code reloads (Hot Module Replacement).
if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, it's simpler: just create the client and connect.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export the promise. Any other file in your application that needs to
// talk to the database will import this `clientPromise`.
// This creates a single, shared connection pool for your entire application.
module.exports = clientPromise;