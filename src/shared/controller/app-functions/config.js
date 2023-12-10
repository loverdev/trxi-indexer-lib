const dotenv = require("dotenv");
dotenv.config();

const envProcess = process.env;
const Config = {
  tronRoute: envProcess.tronRoute,
  mongoAuth: envProcess.mongoAuth,
  mongoDatabase: envProcess.mongoDatabase,
  mongoCollection_balance: envProcess.mongoCollection_balance,
  mongoCollection_token: envProcess.mongoCollection_token,
  mongoCollection_index: envProcess.mongoCollection_index,
  mongoCollection_logs: envProcess.mongoCollection_logs,
  mongoCollection_Inscribed: envProcess.mongoCollection_Inscribed,
  maxBlock: envProcess.maxBlock,
  mint_event: "MINT",
  transfer_event: "TRANSFER",
  BlockHole: envProcess.Blockhole,
  deploy_event: "DEPLOY",
  InscribeTransfer: "INSCRIBETRANSFER",
  Approve: "Approveinscription".toUpperCase(),
  Transferinscribition: "Transferinscribition".toUpperCase(),
  TransferStartHeight: envProcess.TransferSmartStartHeight,
  StartBlock: envProcess.StartBlock,
  API_KEY: envProcess.API_KEY_TRON,
  LatestBlock: envProcess.LatestBlock,
};
module.exports = Config;
