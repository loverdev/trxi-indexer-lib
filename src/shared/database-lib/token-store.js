const { config } = require("..");
const conn = require("./conn");
const TokenQuery = {
  BulkWriteTokenDeployment: async (data) => {
    try {
      const connection = await conn.connect();
      const db = connection.db(config.mongoDatabase);
      const collection = db.collection(config.mongoCollection_token);
      const Store = (await collection.insertMany(data)).insertedCount;
      return Store;
    } catch (error) {
      throw new Error(error);
    }
  },
  updateTokenMintState: async (data) => {
    try {
      const Query = data.map((e) => {
        const q = {
          filter: { tick: e.tick },
          update: {
            $set: {
              minted: e.minted,
              ...(Number(e.supply) === Number(e.minted)
                ? { isMinted: true, mintedblock: e.mintedblock }
                : {}),
            },
          },
        };
        return q;
      });
      const bulkOperations = Query.map(({ filter, update }) => ({
        updateOne: {
          filter,
          update,
        },
      }));

      const connect = await conn.connect();
      const db = connect.db(config.mongoDatabase);
      const collection = db.collection(config.mongoCollection_token);
      return (await collection.bulkWrite(bulkOperations)).modifiedCount;
    } catch (error) {
      console.log(error);
      return 0;
    }
  },
  LoadTokenDeploymentData: async (tickArray) => {
    try {
      const connection = await conn.connect();
      const db = connection.db(config.mongoDatabase);
      const collection = db.collection(config.mongoCollection_token);
      const Store = await collection
        .find({ tick: { $in: tickArray } })
        .toArray();

      return Store.length !== 0 ? Store : false;
    } catch (error) {
      throw new Error(error);
    }
  },
};

module.exports = TokenQuery;
