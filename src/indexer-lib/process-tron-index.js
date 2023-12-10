const { default: Decimal } = require("decimal.js");
const { TronClient, config, logsOutput } = require("../shared");
const IndexTronInscribition = require("./Index-TRC20");
const ArrageBlocks_Transaction = require("./Transaction-helper");
const Inscribition_Worker = require("./inscribition-worker");

const StartIndexing = async (block, maxBlock) => {
  try {
    const Tron = new TronClient(config.tronRoute);

    logsOutput.LogOutput(`Scanning Block ${block} in Tron Mainnet`);

    const BlockBox = [];

    for (let i = 0; i < maxBlock; i++) {
      const NewScanBlock = Number(block) + i;
      BlockBox.push(NewScanBlock);
    }

    const BlockDataPromise = BlockBox.map(async (e) => await Tron.loadBlock(e));

    const BlockData = await Promise.all(BlockDataPromise);

    if (BlockBox.length !== BlockData.length) throw new Error("BlockMissmatch");

    let EventData = [];

    if (new Decimal(config.TransferStartHeight).lte(block)) {
      const BlockEvents = BlockBox.map(
        async (e) => await Tron.getBlockEvent(e)
      );
      EventData = await Promise.all(BlockEvents);
    }

    const ArrageBlockTransaction = ArrageBlocks_Transaction(
      BlockData,
      EventData
    );

    const NewBlock =
      ArrageBlockTransaction[ArrageBlockTransaction.length - 1]?.block ||
      BlockBox[BlockBox.length - 1];

    if (!ArrageBlockTransaction || ArrageBlockTransaction.length === 0)
      return { blockIndex: NewBlock };

    `Found Total ${ArrageBlockTransaction?.length} Transactions till Block ${NewBlock}`;

    const InscribitionReady = await Inscribition_Worker(ArrageBlockTransaction);

    if (!InscribitionReady && InscribitionReady.length === 0)
      return { blockIndex: NewBlock };

    logsOutput.LogOutput(
      `Found ${InscribitionReady.length} Inscribition out of ${ArrageBlockTransaction?.length} Transactions`
    );
    await IndexTronInscribition(InscribitionReady);
    return { blockIndex: NewBlock };
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

module.exports = StartIndexing;
