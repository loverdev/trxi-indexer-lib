const { config } = require("..");
const connection = require("./conn");

const BalanceStore = {
  WriteBalanceinBulk: async (data) => {
    try {
      const QueryData = [];
      const NewCreation = [];
      data.map((e) => {
        e.holding.map((el) => {
          const { updateType } = el;
          if (updateType === "UPDATE_TOKEN_VALUE") {
            return QueryData.push({
              updateOne: {
                filter: { address: e.address },
                update: {
                  $set: {
                    "holding.$[elm].amount": el.amount,
                    "holding.$[elm].inscribed": el.inscribed,
                  },
                },
                arrayFilters: [{ "elm.tick": el.tick }],
              },
            });
          } else if (
            updateType === "PUSH_NEW_TOKEN" ||
            NewCreation.find((a) => a === e.address)
          ) {
            return QueryData.push({
              updateOne: {
                filter: { address: e.address },
                update: {
                  $push: {
                    holding: {
                      tick: el.tick,
                      amount: el.amount,
                      inscribed: el.inscribed,
                      block: el.block,
                      txid: el.txid,
                    },
                  },
                },
              },
            });
          } else {
            NewCreation.push(e.address);
            return QueryData.push({
              insertOne: {
                document: {
                  address: e.address,
                  holding: [
                    {
                      tick: el.tick,
                      amount: el.amount,
                      inscribed: el.inscribed,
                      block: el.block,
                      txid: el.txid,
                    },
                  ],
                },
              },
            });
          }
        });
      });
      const conn = await connection.connect();
      const db = conn.db(config.mongoDatabase);
      const collection = db.collection(config.mongoCollection_balance);
      await collection.bulkWrite(QueryData);
    } catch (error) {
      console.log(error);
    }
  },
  LoadBalancesInfo: async (data) => {
    try {
      const conn = await connection.connect();
      const db = conn.db(config.mongoDatabase);
      const collection = db.collection(config.mongoCollection_balance);
      const DatasInCollection = await collection
        .find({ address: { $in: data } })
        .toArray();
      return DatasInCollection;
    } catch (error) {
      return false;
    }
  },
  StoreLogs: async (data) => {
    try {
      const conn = await connection.connect();
      const db = conn.db(config.mongoDatabase);
      const collection = db.collection(config.mongoCollection_logs);
      await collection.insertMany(data);
    } catch (error) {}
  },
};

module.exports = BalanceStore;
