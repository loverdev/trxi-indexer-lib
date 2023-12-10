const Config = require("./config");
const TronWeb = require("tronweb");
const { Decimal } = require("decimal.js");
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider(Config.tronRoute);
const solidityNode = new HttpProvider(Config.tronRoute);
const eventServer = new HttpProvider(Config.tronRoute);
const WAValidator = require("multicoin-address-validator");

const ValidateMintPayload = (payload) => {
  try {
    const { amt, limit, max, minted } = payload;
    const limitdec = new Decimal(limit);
    const maxdec = new Decimal(max);
    const minteddec = new Decimal(minted);
    const amountdec = new Decimal(amt);

    if (amountdec.gt(limitdec)) return;
    if (minteddec.gte(maxdec)) return;

    const SupplyLeftToMint = Number(max) - Number(minted);
    //1000 - 990
    if (
      new Decimal(SupplyLeftToMint).lt(limit) &&
      !new Decimal(SupplyLeftToMint).isZero()
    ) {
      console.log(`Supply Affect`);
      const IsAmountLast = SupplyLeftToMint;
      return IsAmountLast;
    } else if (!new Decimal(SupplyLeftToMint).isZero()) {
      return amt;
    }
    return false;
  } catch (error) {}
};

const ValidateDeployPayload = (payload) => {
  try {
    const { limit, max } = payload;

    const limitDecimal = new Decimal(limit);
    const maxDecimal = new Decimal(max);

    if (!limit || !limit.length) return;
    if (!max || !max.length) return;

    if (typeof limit !== "string") return;
    if (typeof max !== "string") return;

    if (limit.length > 20 || max.length > 20) return;
    if (limitDecimal.isZero() || limitDecimal.isNeg() || limitDecimal.isNaN())
      return;

    if (maxDecimal.isZero() || maxDecimal.isNeg() || maxDecimal.isNaN()) return;

    if (limitDecimal.gt(maxDecimal)) return;
    return true;
  } catch (error) {}
};

const HexToTron = (hex) => {
  try {
    const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);
    const tronAddress = tronWeb.address.fromHex(hex);
    return tronAddress;
  } catch (error) {
    console.log(error);
  }
};

const DecodeHex = (hex) => {
  try {
    const Hex = Buffer.from(hex, "hex").toString("utf-8");
    return Hex;
  } catch (error) {}
};

const ValidateTronAddress = (address) => {
  try {
    const vaild = WAValidator.validate(address, "tron");

    return vaild;
  } catch (error) {
    return false;
  }
};

const DecodeToInscribition = (text, from) => {
  try {
    const IsAddressValid = ValidateTronAddress(from);

    if (/\s/.test(text) || !IsAddressValid)
      return { type: "Unkown", decodedData: text, from: from };

    const IsToken = text.split(":,");
    if (IsToken[0] === "data") {
      const TokenMeta = FormatToken(IsToken[1]);
      if (!TokenMeta) return;
      return {
        type: "Token",
        decodedData: TokenMeta,
        from: from,
      };
    }
    return { type: "Unkown", decodedData: text, from: from };
  } catch (error) {}
};

const FormatToken = (json) => {
  try {
    const TokenJson = JSON.parse(json);

    const p = TokenJson?.p;
    const op = TokenJson?.op;
    const max = TokenJson?.max;
    const limit = TokenJson?.lim;
    const amt = TokenJson?.amt;
    const tick_ = TokenJson?.tick;

    if (typeof tick_ !== "string") return;
    if (max && typeof max !== "string") return;
    if (limit && typeof limit !== "string") return;
    if (amt && typeof amt !== "string") return;

    if (amt && isNaN(amt)) return;
    if (max && isNaN(max)) return;
    if (limit && isNaN(limit)) return;

    const tick = tick_.toLowerCase();
    if (!p || !op) return;
    if (Buffer.from(tick, "utf-8").length !== 4) return;
    if (!["deploy", "mint", "transfer"].includes(op)) return;
    if (p !== "trc-20") return;
    if (op === "deploy") {
      if (!limit || !max) return;

      return {
        tick: tick,
        max: max,
        limit: limit,
        json: json,
        TRC_20_TYPE: Config.deploy_event,
      };
    } else if (op === "mint") {
      if (!amt) return;
      if (new Decimal(amt).isNeg() || new Decimal(amt).isZero()) return;

      return {
        tick: tick,
        amt: amt,
        json: json,
        TRC_20_TYPE: Config.mint_event,
      };
    } else if (op === "transfer") {
      const TransferDetails = TokenJson?.detail;
      if (!TransferDetails) return;

      const DetailsInfo = TransferDetails.map((a) => {
        const amount = a?.amt;
        const Receiver = a?.to;
        if (typeof amount !== "string") return;
        const IsAddressValid = ValidateTronAddress(Receiver);
        if (!amount) return;
        if (!IsAddressValid) return;
        if (!Receiver) return;
        if (isNaN(amount)) return;
        if (new Decimal(amount).isNeg() || new Decimal(amount).isZero()) return;

        return { receiver: Receiver, amount: amount };
      });
      const ValidTransfer = DetailsInfo.filter((a) => a !== undefined);
      return {
        tick: tick,
        json: json,
        TRC_20_TYPE: Config.transfer_event,
        TransferData: ValidTransfer,
      };
    }
  } catch (error) {}
};

module.exports = {
  DecodeHex,
  DecodeToInscribition,
  ValidateMintPayload,
  HexToTron,
  ValidateDeployPayload,
};
