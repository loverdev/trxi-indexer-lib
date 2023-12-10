const { MongoClient } = require("mongodb");
const { config } = require("..");
const Client = new MongoClient(config.mongoAuth, {});

module.exports = Client;
