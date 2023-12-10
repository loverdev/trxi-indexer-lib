const config = require("./controller/app-functions/config");
const TronClient = require("./controller/tron-client/client");
const logsOutput = require("./controller/app-functions/logsBref");
const {
  DecodeToInscribition,
  DecodeHex,
  ValidateDeployPayload,
  ValidateMintPayload,
  HexToTron,
} = require("./controller/app-functions/functions");

module.exports = {
  config,
  TronClient,
  DecodeToInscribition,
  DecodeHex,
  HexToTron,
  ValidateDeployPayload,
  ValidateMintPayload,
  logsOutput,
};
