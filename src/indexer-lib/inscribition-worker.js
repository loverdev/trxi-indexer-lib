const {
  DecodeHex,
  DecodeToInscribition,
  HexToTron,
  config,
} = require("../shared");
const Config = require("../shared/controller/app-functions/config");

const Inscribition_Worker = async (data) => {
  try {
    const InscribitionBox = [];
    for (const Transactions of data) {
      const block = Transactions?.block;
      const InscribitionHex = Transactions?.raw_data;
      const Events = Transactions?.Events;

      if (Events.length !== 0) {
        InscribitionHex?.contract.map((e, index) => {
          const OwnerAddress = e?.parameter?.value?.owner_address;
          const ContractAddress = e?.parameter?.value?.contract_address;

          const TronContractAddress = HexToTron(ContractAddress);
          const OwnerAddressTron = HexToTron(OwnerAddress);

          for (const Event of Events) {
            const contractCalledWith = Event.contractCalledWith;

            if (
              contractCalledWith.toLowerCase() !==
              TronContractAddress.toLowerCase()
            )
              continue;

            const Method = Event?.Method;

            if (Method === config.InscribeTransfer) {
              let InscribeTransfer = {};

              InscribeTransfer["tick"] = Event?.tick?.toLowerCase();
              InscribeTransfer["amt"] = Event?.amt;
              InscribeTransfer["TRC_20_TYPE"] = config.InscribeTransfer;

              InscribitionBox.push({
                type: "Token",
                decodedData: { ...InscribeTransfer },
                from: OwnerAddressTron,
                txid: Transactions?.txID,
                time: InscribitionHex?.timestamp,
                block: block,
                contractAddress: TronContractAddress,
              });
            } else if (Method === config.Approve) {
              let Approve = {};
              Approve["TRC_20_TYPE"] = config.Approve;
              Approve["inscription_id"] = Event?.inscription_id;
              Approve["owner"] = Event?.owner;
              InscribitionBox.push({
                type: "Token",
                decodedData: { ...Approve },
                from: OwnerAddressTron,
                txid: Transactions?.txID,
                time: InscribitionHex?.timestamp,
                block: block,
                contractAddress: TronContractAddress,
              });
            } else if (Method === config.Transferinscribition) {
              let Transfer = {};

              Transfer["TRC_20_TYPE"] = config.Transferinscribition;
              Transfer["inscription_id"] = Event?.inscription_id;
              Transfer["sender"] = Event?.sender;
              Transfer["receiver"] = Event?.Receiver;
              InscribitionBox.push({
                type: "Token",
                decodedData: { ...Transfer },
                from: OwnerAddressTron,
                txid: Transactions?.txID,
                time: InscribitionHex?.timestamp,
                block: block,
                contractAddress: TronContractAddress,
              });
            }
          }
        });
      }

      if (!InscribitionHex || !InscribitionHex.data) continue;

      const HexDecoded = DecodeHex(InscribitionHex?.data);
      if (!HexDecoded) continue;

      const AddressHolder = InscribitionHex?.contract[0]?.parameter?.value;
      const From = AddressHolder?.owner_address;
      const To = AddressHolder?.to_address;
      if (To !== Config.BlockHole) continue;

      const TronAddress = HexToTron(From);
      if (!TronAddress) continue;

      const DecodedToInscribiton = DecodeToInscribition(
        HexDecoded,
        TronAddress
      );
      if (!DecodedToInscribiton) continue;
      InscribitionBox.push({
        ...DecodedToInscribiton,
        txid: Transactions?.txID,
        time: InscribitionHex?.timestamp,
        block: block,
        amount: AddressHolder?.amount,
      });
    }
    return InscribitionBox;
  } catch (error) {
    console.log(error);
  }
};

module.exports = Inscribition_Worker;
