const { default: Decimal } = require("decimal.js");
const { config, TronClient } = require("..");
const connection = require("./conn");

const IndexerQuery = {
  GetLastSyncBlock: async function () {
    try {
      const conn = await connection.connect();
      const database = conn.db(config.mongoDatabase);
      const collection = database.collection(config.mongoCollection_index);
      const Result = await collection.find({}).toArray();
      if (Result.length === 0) return config.StartBlock;
      const LastBlock = Result[0].LastBlock;
      return Number(LastBlock);
    } catch (error) {
      console.log(error);
    }
  },
  GetLatestBlock: async function () {
    try {
      const conn = await connection.connect();
      const database = conn.db(config.mongoDatabase);
      const collection = database.collection(config.mongoCollection_index);
      const Result = await collection.find({}).toArray();
      if (Result.length === 0) return config.LatestBlock;
      const LatestBlock = Result[0].LatestBlock;
      return Number(LatestBlock);
    } catch (error) {
      console.log(error);
    }
  },
  SaveLastSyncBlock: async function (block) {
    try {
      const conn = await connection.connect();
      const database = conn.db(config.mongoDatabase);
      const collection = database.collection(config.mongoCollection_index);
      const Find = await collection.find({ Type: "drc_indexer" }).toArray();
      if (Find.length == 0) {
        const Query = {
          Type: "drc_indexer",
          LastBlock: Number(block),
          LatestBlock: Number(config.LatestBlock),
        };
        const Result = await collection.insertOne(Query);
      } else {
        await collection.updateOne(
          { Type: "drc_indexer" },
          { $set: { LastBlock: Number(block) } }
        );
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  },
  UpdateLastestBlock: async function (LastSynedBlock) {
    try {
      const TronClients = new TronClient(config.tronRoute);

      const GetNewBlock = await TronClients.getLatestBlock();
      if (!GetNewBlock) return;
      const conn = await connection.connect();
      const database = conn.db(config.mongoDatabase);
      const collection = database.collection(config.mongoCollection_index);
      if (!new Decimal(Number(LastSynedBlock)).lte(Number(GetNewBlock))) return;
      await collection.updateOne(
        { Type: "drc_indexer" },
        { $set: { LatestBlock: Number(GetNewBlock) } }
      );
    } catch (error) {
      throw error;
    }
  },
};

module.exports = IndexerQuery;
