const { default: axios } = require("axios");
const logsBref = require("../app-functions/logsBref");
const Config = require("../app-functions/config");

class TronClient {
  tronRoute;
  constructor(route) {
    this.tronRoute = route;
  }

  async getLatestBlock() {
    try {
      const config = {
        method: "get",
        maxBodyLength: Infinity,
        url: `${this.tronRoute}walletsolidity/getnowblock`,
        headers: {
          "Content-Type": "application/json",
          "TRON-PRO-API-KEY": Config.API_KEY,
        },
      };
      const fire = await axios.request(config);
      if (fire.data) return fire?.data?.block_header?.raw_data?.number;
      logsBref.ErrorLogs(`Faild to fetch latest Block , Retrying in 3sec....`);
      await new Promise((resolve) => setTimeout(() => resolve(), 3000));
      return await this.getLatestBlock();
    } catch (error) {
      logsBref.ErrorLogs(`Faild to fetch latest Block , Retrying in 3sec....`);
      await new Promise((resolve) => setTimeout(() => resolve(), 3000));
      return await this.getLatestBlock();
    }
  }
  async getBlockEvent(block) {
    try {
      const config = {
        method: "get",
        maxBodyLength: Infinity,
        url: `${this.tronRoute}v1/blocks/${block}/events`,
        headers: {
          "Content-Type": "application/json",
          "TRON-PRO-API-KEY": Config.API_KEY,
        },
      };
      const fire = await axios.request(config);
      if (fire.data?.success) return fire?.data?.data;

      logsBref.ErrorLogs(
        `Faild to get event for Block ${block}, Retrying in 3sec...`
      );

      await new Promise((resolve) => setTimeout(() => resolve(), 3000));

      return await this.getLatestBlock();
    } catch (error) {
      logsBref.ErrorLogs(
        `Faild to get event for Block ${block}, Retrying in 3sec...`
      );

      await new Promise((resolve) => setTimeout(() => resolve(), 3000));
      return await this.getLatestBlock();
    }
  }

  async loadBlock(blocknum) {
    try {
      const config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `${this.tronRoute}wallet/getblockbynum`,
        headers: {
          "Content-Type": "application/json",
          "TRON-PRO-API-KEY": Config.API_KEY,
        },
        data: JSON.stringify({ num: Number(blocknum) }),
      };
      const fire = await axios.request(config);
      if (fire.data) return fire.data;

      logsBref.ErrorLogs(
        `Faild to fetch Block ${blocknum}, Retrying in 3sec....`
      );
      await new Promise((resolve) => setTimeout(() => resolve(), 3000));
      return await this.loadBlock(blocknum);
    } catch (error) {
      console.log(error);
      logsBref.ErrorLogs(
        `Faild to fetch Block ${blocknum}, Retrying in 3sec....`
      );
      await new Promise((resolve) => setTimeout(() => resolve(), 3000));
      return await this.loadBlock(blocknum);
    }
  }
}
module.exports = TronClient;
