const { HexToTron } = require("../shared");
const Config = require("../shared/controller/app-functions/config");

//Test
const EventToIndex = [
  "InscribeTransfer(address indexed owner, string tick, uint256 amt)",
  "Approveinscription(address indexed owner, string inscription_id)",
  "Transferinscription(address indexed sender, address indexed receiver, string inscription_id)",
];

const ArrageBlocks_Transaction = (data, EventsData) => {
  try {
    const TransactionData = [];
    for (const transactions of data) {
      const BlockNumber = transactions?.block_header?.raw_data?.number;
      const Transaction = transactions?.transactions;
      Transaction?.map((e, index) => {
        const BlockEvents = [];
        const TransactionId = e?.txID;
        if (EventsData.length !== 0) {
          EventsData?.map((el) => {
            if (!el.length) return;
            for (const EventData of el) {
              if (
                EventData?.transaction_id.toLowerCase() !==
                TransactionId.toLowerCase()
              )
                continue;

              const EventTypes = EventData?.event;
              if (!EventToIndex.includes(EventTypes)) continue;

              const EventName = EventData?.event_name;
              const ContractAddress = EventData?.contract_address;
              if (
                EventName.toLowerCase() ===
                Config.InscribeTransfer.toLowerCase()
              ) {
                //InscribeTransfer Event
                const EventResult = EventData.result;
                const Amount = EventResult?.amt / 10 ** 18; //conver to decimal
                const tick = EventResult?.tick;
                const Owner = EventResult?.owner;
                BlockEvents.push({
                  Method: Config.InscribeTransfer,
                  amt: Amount,
                  tick: tick,
                  owner: Owner,
                  contractCalledWith: ContractAddress,
                });
              }

              if (EventName.toLowerCase() === Config.Approve.toLowerCase()) {
                //Approve
                const EventResult = EventData.result;
                const Owner = EventResult?.owner;
                const InscripitionId = EventResult?.inscription_id;
                BlockEvents.push({
                  Method: Config.Approve,
                  owner: Owner,
                  contractCalledWith: ContractAddress,
                  inscription_id: InscripitionId,
                });
              }

              if (
                EventName.toLowerCase() ===
                Config.Transferinscribition.toLowerCase()
              ) {
                const EventResult = EventData.result;
                const Receiver = EventResult?.receiver;
                const sender = EventResult?.sender;
                const inscription_id = EventResult?.inscription_id;
                BlockEvents.push({
                  Method: Config.Transferinscribition,
                  Receiver: HexToTron(Receiver),
                  sender: HexToTron(sender),
                  contractCalledWith: ContractAddress,
                  inscription_id: inscription_id,
                });
              }
            }
          });
        }
        TransactionData.push({
          ...e,
          block: BlockNumber,
          index,
          Events: BlockEvents,
        });
      });
    }

    return TransactionData.sort((a, b) => {
      if (a.block === b.block) {
        return a.index - b.index;
      }
      return a.block - b.block;
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = ArrageBlocks_Transaction;
