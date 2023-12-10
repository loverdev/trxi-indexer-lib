const { config } = require("..");
const connection = require("./conn");

const IandA = {
  StoreInscribedLogs: async (data) => {
    try {
      const conn = await connection.connect();
      const db = conn.db(config.mongoDatabase);
      const collection = db.collection(config.mongoCollection_Inscribed);
      await collection.insertMany(data);
    } catch (error) {
      console.log(error);
    }
  },
  LoadInscribedInfo: async (id, address, contract) => {
    try {
      const conn = await connection.connect();
      const db = conn.db(config.mongoDatabase);
      const collection = db.collection(config.mongoCollection_Inscribed);
      const Filter = { id: id, address: address, Approved_Contract: contract };
      const InscribeInfo = await collection.findOne(Filter);
      if (InscribeInfo === null) return false;
      return InscribeInfo;
    } catch (error) {
      console.log(error);
      return false;
    }
  },
  DeleteInscribedLogs: async (id, address) => {
    try {
      const conn = await connection.connect();
      const db = conn.db(config.mongoDatabase);
      const collection = db.collection(config.mongoCollection_Inscribed);
      const Filter = { id: id, address: address };
      const DeletedCount = await collection.deleteOne(Filter);
      if (!DeletedCount) throw new Error("Something not working."); //need to stop !!!
    } catch (error) {
      throw new Error("Something not working.");
    }
  },
  UpdateInscribeState: async (id, contract, address) => {
    try {
      const conn = await connection.connect();
      const db = conn.db(config.mongoDatabase);
      const collection = db.collection(config.mongoCollection_Inscribed);

      const Filter = { id: id, Approved_Contract: null, address: address };
      const Update = { $set: { Approved_Contract: contract } };
      const UpdatedCount = (await collection.updateOne(Filter, Update))
        .modifiedCount;
      return UpdatedCount;
    } catch (error) {
      console.log(error);
      return 0;
    }
  },
};

module.exports = IandA;
