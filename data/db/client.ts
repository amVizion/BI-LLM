
import { MongoClient, ServerApiVersion } from 'mongodb'
import { uri } from './ignore/config.json'

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
})

export const DB_NAME = "BI-LLM"
export const getMongoClient = async() => {
  // Connect the client to the server	(optional starting in v4.7)
  await client.connect()
  // Send a ping to confirm a successful connection
  await client.db(DB_NAME).command({ ping: 1 })
  console.log("Pinged BI-LLM. Successfully connected to MongoDB!")
  return client
}
