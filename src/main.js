const { default: Decimal } = require("decimal.js");
const StartIndexing = require("./indexer-lib/process-tron-index");
const { logsOutput } = require("./shared");
const IndexerQuery = require("./shared/database-lib/index-query");

let BlockToScan = false;
const StartApp = async () => {
  try {
    if (BlockToScan === 0) logsOutput.LogOutput("Starting TRC Indexer.....");

    const latstBlock = BlockToScan || (await IndexerQuery.GetLastSyncBlock());

    logsOutput.LogOutput(`Starting to index from Block ${latstBlock}`);

    const latestBlock = await IndexerQuery.GetLatestBlock();

    const BlockDifference = latestBlock - latstBlock;
    const BlockPerScan = BlockDifference >= 20 ? 13 : BlockDifference - 2;

    if (new Decimal(Number(latstBlock) + 6).gte(latestBlock)) {
      await IndexerQuery.UpdateLastestBlock(latstBlock);

      logsOutput.LogOutput(`All job done trying again in 20sec....`);
      await new Promise((resolve) => setTimeout(() => resolve(), 1 * 1000));
      return await StartApp();
    }
    const IndexBlock = await StartIndexing(latstBlock, BlockPerScan);

    if (!IndexBlock) {
      await new Promise((resolve) => setTimeout(() => resolve(), 5000));
      return await StartApp();
    }

    const NewBlockToScan = IndexBlock?.blockIndex + 1;

    BlockToScan = NewBlockToScan;

    await IndexerQuery.SaveLastSyncBlock(NewBlockToScan);

    await new Promise((resolve) => setTimeout(() => resolve(), 1100));

    return await StartApp();
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

module.exports = StartApp;
