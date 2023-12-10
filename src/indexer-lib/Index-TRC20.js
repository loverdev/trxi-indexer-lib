const { default: Decimal } = require("decimal.js");
const {
  config,
  ValidateDeployPayload,
  ValidateMintPayload,
  HexToTron,
} = require("../shared");
const BalanceStore = require("../shared/database-lib/balance-store");
const TokenQuery = require("../shared/database-lib/token-store");
const IandA = require("../shared/database-lib/inscribe-approve-store");

const IndexTronInscribition = async (InscribitionData) => {
  try {
    const TokenDeployedCache = []; //cache development

    const EventLogs = []; //save logs

    const DeploymentDataToStore = []; //data to store development

    const TokenToCheck = []; //token to check bulk from database

    const BalancesDatabase = []; //balances of address from database

    const BalanceJunk = []; // balances to store

    const InscribedLogsToStore = []; //Store inscribed token data

    InscribitionData.map((e) => {
      const { type, decodedData } = e;
      if (type.toLowerCase() !== "token") return;
      const Tick = decodedData?.tick;
      if (!Tick) return;
      const IsTickInArray = TokenToCheck.find((a) => a === Tick);
      if (IsTickInArray) return;
      TokenToCheck.push(Tick);
    });

    //Need to off this feature to support approve checking

    //  if (TokenToCheck.length === 0) return; //No need to check if there is no tick

    const FindTickDeploymentData = await TokenQuery.LoadTokenDeploymentData(
      TokenToCheck
    );

    if (FindTickDeploymentData) {
      FindTickDeploymentData.map((e) => {
        const { tick, limit, supply, minted, mintedblock } = e;
        TokenDeployedCache.push({
          tick: tick,
          limit: limit,
          supply: supply,
          minted: minted,
          mintedblock: mintedblock,
        });
      });
    }

    const AllUniqueAddress = [];

    InscribitionData.map((e) => {
      const { type, from, decodedData } = e;
      if (type.toLowerCase() !== "token") return;

      const EventType = decodedData?.TRC_20_TYPE;

      if (EventType === config.transfer_event) {
        const { TransferData } = decodedData;
        TransferData.map((a) => {
          const ReceiverAddress = a?.receiver;
          const IsAddressUnqiue = AllUniqueAddress.find(
            (a) => a === ReceiverAddress
          );
          if (!IsAddressUnqiue) AllUniqueAddress.push(ReceiverAddress);
        });
      } else if (EventType === config.Transferinscribition) {
        const { sender, receiver } = decodedData;

        const IsCheckingSender = AllUniqueAddress.find((a) => a === sender);
        if (!IsCheckingSender) {
          AllUniqueAddress.push(sender);
        }
        const IsCheckingReceiver = AllUniqueAddress.find((a) => a === receiver);
        if (!IsCheckingReceiver) {
          AllUniqueAddress.push(receiver);
        }
      }

      const IsAddressUnqiue = AllUniqueAddress.find((a) => a === from);
      if (!IsAddressUnqiue) AllUniqueAddress.push(from);
    });

    const LoadAddressBalanceInfos = await BalanceStore.LoadBalancesInfo(
      AllUniqueAddress
    );

    if (LoadAddressBalanceInfos && LoadAddressBalanceInfos.length !== 0) {
      const BalanceofUser = LoadAddressBalanceInfos.map((e) => {
        const address = e.address;
        const holding = e.holding;
        return { address, holding };
      });
      BalancesDatabase.push(...BalanceofUser);
    }

    for (const Inscribition of InscribitionData) {
      const {
        from,
        type,
        txid,
        time,
        amount,
        contractAddress,
        block,
        decodedData,
      } = Inscribition;

      if (type.toLowerCase() !== "token") continue;

      const { TRC_20_TYPE, tick } = decodedData;

      if (TRC_20_TYPE === config.deploy_event) {
        const { limit, max } = decodedData;

        const IsDeployValid = ValidateDeployPayload({ limit: limit, max: max });

        const CheckIfTokenIsDeployed = TokenDeployedCache.find(
          (a) => a.tick === tick
        );

        if (CheckIfTokenIsDeployed) continue;

        if (!IsDeployValid) continue;

        let TokenDeployData = {};

        TokenDeployData["tick"] = tick;
        TokenDeployData["limit"] = Number(limit);
        TokenDeployData["supply"] = Number(max);
        TokenDeployData["minted"] = 0;
        TokenDeployData["deployer"] = from;
        TokenDeployData["txid"] = txid;
        TokenDeployData["timestamp"] = time;
        TokenDeployData["deployblock"] = block;
        TokenDeployData["isMinted"] = false;
        TokenDeployData["mintedblock"] = 0;

        DeploymentDataToStore.push(TokenDeployData);

        let TokenDeployedCacheData = {};
        TokenDeployedCacheData["tick"] = tick;
        TokenDeployedCacheData["limit"] = Number(limit);
        TokenDeployedCacheData["supply"] = Number(max);
        TokenDeployedCacheData["minted"] = 0;
        TokenDeployedCacheData["mintedblock"] = 0;
        TokenDeployedCache.push(TokenDeployedCacheData);

        EventLogs.push({
          event: config.deploy_event,
          address: from,
          max: max,
          limit: limit,
          txid: txid,
          id: `${txid}i0`,
          tick: tick,
          block: block,
          time: time,
        });
      } else if (TRC_20_TYPE === config.mint_event) {
        const { amt } = decodedData;

        const CheckIfTokenIsDeployed = TokenDeployedCache.find(
          (a) => a.tick === tick
        );

        if (!CheckIfTokenIsDeployed) continue;

        const limit = CheckIfTokenIsDeployed?.limit;
        const max = CheckIfTokenIsDeployed?.supply;
        const minted = CheckIfTokenIsDeployed?.minted;

        const ValidateMint = ValidateMintPayload({
          amt: amt,
          limit: limit,
          max: max,
          minted: minted,
        });
        if (!ValidateMint) continue;

        CheckIfTokenIsDeployed.minted += Number(ValidateMint);
        CheckIfTokenIsDeployed.mintedblock = block;
        const IsMinterInJunk = BalanceJunk.find((a) => a?.address === from);

        const IsMinterInDataBase = BalancesDatabase.find(
          (a) => a.address === from
        );

        const HasMinterInJunkHasSameToken = IsMinterInJunk?.holding?.find(
          (a) => a?.tick === tick
        );
        const IsTokenAlreadyInDataBase = IsMinterInDataBase?.holding?.find(
          (a) => a?.tick === tick
        );

        if (IsMinterInJunk && HasMinterInJunkHasSameToken) {
          IsMinterInJunk.holding = IsMinterInJunk.holding.map((e) =>
            e.tick === tick
              ? {
                  tick: tick,
                  amount: Number(e.amount) + Number(ValidateMint),
                  txid: txid,
                  block: block,
                  inscribed: e.inscribed,
                  id: `${txid}i0`,
                  updateType: (() => {
                    if (IsMinterInDataBase && !IsTokenAlreadyInDataBase) {
                      return "PUSH_NEW_TOKEN";
                    } else if (IsMinterInDataBase && IsTokenAlreadyInDataBase) {
                      return "UPDATE_TOKEN_VALUE";
                    } else {
                      return "CREATE_NEW_WALLET";
                    }
                  })(),
                }
              : e
          );
        } else if (IsMinterInJunk && !HasMinterInJunkHasSameToken) {
          IsMinterInJunk.holding.push({
            tick: tick,
            amount: (() => {
              if (IsMinterInDataBase && !IsTokenAlreadyInDataBase) {
                return Number(ValidateMint);
              } else if (IsMinterInDataBase && IsTokenAlreadyInDataBase) {
                return (
                  Number(ValidateMint) + Number(IsTokenAlreadyInDataBase.amount)
                );
              } else {
                return Number(ValidateMint);
              }
            })(),
            inscribed: (() => {
              if (IsMinterInDataBase && !IsTokenAlreadyInDataBase) {
                return Number(0);
              } else if (IsMinterInDataBase && IsTokenAlreadyInDataBase) {
                return Number(IsTokenAlreadyInDataBase.inscribed);
              } else {
                return Number(0);
              }
            })(),
            txid: txid,
            block: block,
            id: `${txid}i0`,
            updateType: (() => {
              if (IsMinterInDataBase && !IsTokenAlreadyInDataBase) {
                return "PUSH_NEW_TOKEN";
              } else if (IsMinterInDataBase && IsTokenAlreadyInDataBase) {
                return "UPDATE_TOKEN_VALUE";
              } else {
                return "CREATE_NEW_WALLET";
              }
            })(),
          });
        } else {
          let BalanceUpdate = {};
          BalanceUpdate["address"] = from;
          BalanceUpdate["holding"] = [
            {
              tick: tick,
              amount: (() => {
                if (IsMinterInDataBase && !IsTokenAlreadyInDataBase) {
                  return Number(ValidateMint);
                } else if (IsMinterInDataBase && IsTokenAlreadyInDataBase) {
                  return (
                    Number(ValidateMint) +
                    Number(IsTokenAlreadyInDataBase.amount)
                  );
                } else {
                  return Number(ValidateMint);
                }
              })(),
              inscribed: (() => {
                if (IsMinterInDataBase && !IsTokenAlreadyInDataBase) {
                  return Number(0);
                } else if (IsMinterInDataBase && IsTokenAlreadyInDataBase) {
                  return Number(IsTokenAlreadyInDataBase.inscribed);
                } else {
                  return Number(0);
                }
              })(),
              txid: txid,
              block: block,
              id: `${txid}i0`,
              updateType: (() => {
                if (IsMinterInDataBase && !IsTokenAlreadyInDataBase) {
                  return "PUSH_NEW_TOKEN";
                } else if (IsMinterInDataBase && IsTokenAlreadyInDataBase) {
                  return "UPDATE_TOKEN_VALUE";
                } else {
                  return "CREATE_NEW_WALLET";
                }
              })(),
            },
          ];
          BalanceJunk.push(BalanceUpdate);
        }
        EventLogs.push({
          event: config.mint_event,
          address: from,
          amt: amt,
          id: `${txid}i0`,
          tick: tick,
          block: block,
          time: time,
        });
      } else if (TRC_20_TYPE == config.transfer_event) {
        const CheckIfTokenIsDeployed = TokenDeployedCache.find(
          (a) => a.tick === tick
        );

        if (!CheckIfTokenIsDeployed) continue;

        //From is the sender
        const IsSenderInCache = BalanceJunk.find(
          (a) => a.address === from && a.holding.find((b) => b.tick === tick)
        );
        const IsSenderInDataBase = BalancesDatabase.find(
          (a) => a.address === from && a.holding.find((b) => b.tick === tick)
        );

        let SenderController;

        if (IsSenderInCache) {
          SenderController = IsSenderInCache;
        } else {
          SenderController = IsSenderInDataBase;
        }

        if (!SenderController) continue; //sender was not found

        const SellerBalanceForTick = SenderController.holding.find(
          (a) => a.tick === tick
        ); //Now lets see the sender Balance for the tick

        const Balance = SellerBalanceForTick?.amount;

        const { TransferData } = decodedData;
        if (TransferData.length === 0) continue;

        for (const Transfer of TransferData) {
          //lets begain the logic
          const ReceiverAddress = Transfer?.receiver;
          const amount = Transfer?.amount;
          if (new Decimal(amount).gt(Balance)) continue; //balance is less then amount

          if (IsSenderInCache) {
            const SellerBalanceStoredInJunk = BalanceJunk.find(
              (a) => a.address === from
            );
            SellerBalanceStoredInJunk.holding =
              SellerBalanceStoredInJunk.holding.map((el) =>
                el.tick !== tick
                  ? el
                  : {
                      tick: tick,
                      amount: Number(el.amount) - Number(amount),
                      inscribed: el.inscribed,
                      txid: txid,
                      block: block,
                      id: `${txid}i0`,
                      updateType: el.updateType,
                    }
              );
          } else if (IsSenderInDataBase) {
            const IsSenderAddressinCache = BalanceJunk.find(
              (a) => a.address === from
            );
            if (IsSenderAddressinCache) {
              IsSenderAddressinCache.holding.push({
                tick: tick,
                amount: Number(Balance) - Number(amount),
                inscribed: SellerBalanceForTick?.inscribed,
                txid: txid,
                block: block,
                id: `${txid}i0`,
                updateType: "UPDATE_TOKEN_VALUE",
              });
            } else {
              let BalanceUpdate = {};

              BalanceUpdate["address"] = from;
              BalanceUpdate["holding"] = [
                {
                  tick: tick,
                  amount: Number(Balance) - Number(amount),
                  inscribed: SellerBalanceForTick?.inscribed,
                  txid: txid,
                  block: block,
                  id: `${txid}i0`,
                  updateType: "UPDATE_TOKEN_VALUE",
                },
              ];

              BalanceJunk.push(BalanceUpdate);
            }
          } else {
            throw new Error("Sender was not found in database and cahce");
          }

          /********************Checking Reciver********************** */

          const IsReceiverInDataBase = BalancesDatabase.find(
            (a) => a.address === ReceiverAddress
          );

          const IsReceiverInCache = BalanceJunk.find(
            (a) => a.address === ReceiverAddress
          );
          const ReceiverValue = IsReceiverInDataBase?.holding?.find(
            (a) => a?.tick === tick
          );

          if (IsReceiverInCache) {
            const isReceiverHoldingSameToken = IsReceiverInCache.holding.find(
              (a) => a.tick === tick
            );
            if (isReceiverHoldingSameToken) {
              IsReceiverInCache.holding = IsReceiverInCache.holding.map((e) =>
                e.tick !== tick
                  ? e
                  : {
                      tick: tick,
                      amount: Number(e.amount) + Number(amount),
                      inscribed: e.inscribed,
                      txid: txid,
                      block: block,
                      id: `${txid}i0`,
                      updateType: e.updateType,
                    }
              );
            } else {
              IsReceiverInCache.holding.push({
                tick: tick,
                amount: (() => {
                  if (IsReceiverInDataBase && !ReceiverValue) {
                    return Number(amount);
                  } else if (IsReceiverInDataBase && ReceiverValue) {
                    return Number(ReceiverValue.amount) + Number(amount);
                  } else {
                    return Number(amount);
                  }
                })(),
                inscribed: (() => {
                  if (IsReceiverInDataBase && !ReceiverValue) {
                    return Number(0);
                  } else if (IsReceiverInDataBase && ReceiverValue) {
                    return Number(ReceiverValue.inscribed);
                  } else {
                    return Number(0);
                  }
                })(),

                txid: txid,
                block: block,
                id: `${txid}i0`,
                updateType: (() => {
                  if (IsReceiverInDataBase && !ReceiverValue) {
                    return "PUSH_NEW_TOKEN";
                  } else if (IsReceiverInDataBase && ReceiverValue) {
                    return "UPDATE_TOKEN_VALUE";
                  } else {
                    return "CREATE_NEW_WALLET";
                  }
                })(),
              });
            }
          } else if (IsReceiverInDataBase) {
            let BalanceUpdate = {};

            BalanceUpdate["address"] = ReceiverAddress;
            BalanceUpdate["holding"] = [
              {
                tick: tick,
                amount: (() => {
                  if (IsReceiverInDataBase && !ReceiverValue) {
                    return Number(amount);
                  } else if (IsReceiverInDataBase && ReceiverValue) {
                    return Number(ReceiverValue.amount) + Number(amount);
                  } else {
                    return Number(amount);
                  }
                })(),
                inscribed: (() => {
                  if (IsReceiverInDataBase && !ReceiverValue) {
                    return Number(0);
                  } else if (IsReceiverInDataBase && ReceiverValue) {
                    return Number(ReceiverValue.inscribed);
                  } else {
                    return Number(0);
                  }
                })(),
                txid: txid,
                block: block,
                id: `${txid}i0`,
                updateType: (() => {
                  if (IsReceiverInDataBase && !ReceiverValue) {
                    return "PUSH_NEW_TOKEN";
                  } else if (IsReceiverInDataBase && ReceiverValue) {
                    return "UPDATE_TOKEN_VALUE";
                  } else {
                    return "CREATE_NEW_WALLET";
                  }
                })(),
              },
            ];
            BalanceJunk.push(BalanceUpdate);
          } else {
            let BalanceUpdate = {};

            BalanceUpdate["address"] = ReceiverAddress;
            BalanceUpdate["holding"] = [
              {
                tick: tick,
                amount: Number(amount),
                inscribed: 0,
                txid: txid,
                block: block,
                id: `${txid}i0`,
                updateType: "CREATE_NEW_WALLET",
              },
            ];

            BalanceJunk.push(BalanceUpdate);
          }
          EventLogs.push({
            event: config.transfer_event,
            from: from,
            to: ReceiverAddress,
            amt: amount,
            id: `${txid}i0`,
            tick: tick,
            block: block,
            time: time,
          });
        }
      } else if (TRC_20_TYPE === config.InscribeTransfer) {
        const CheckIfTokenIsDeployed = TokenDeployedCache.find(
          (a) => a.tick === tick
        );

        if (!CheckIfTokenIsDeployed) continue;

        const { amt } = decodedData;

        let BalanceController;

        const CheckUserBalance = BalancesDatabase.find(
          (a) => a.address === from && a.holding.find((b) => b.tick === tick)
        );
        const CheckUserBalanceInJunk = BalanceJunk.find(
          (a) => a.address === from && a.holding.find((b) => b.tick === tick)
        );

        if (CheckUserBalanceInJunk) {
          const UserBalance = CheckUserBalanceInJunk.holding.find(
            (a) => a.tick === tick
          );
          BalanceController = UserBalance;
        } else if (CheckUserBalance) {
          const UserBalance = CheckUserBalance.holding.find(
            (a) => a.tick === tick
          );
          BalanceController = UserBalance;
        }

        if (!BalanceController) continue;

        const UserBalance = BalanceController?.amount;
        const UserInscribed = BalanceController?.inscribed || 0;

        if (new Decimal(UserBalance).lt(amt)) continue;

        const UpdatedUserBalance = Number(UserBalance) - Number(amt);
        const UpdatedUserInscribedBalance = Number(UserInscribed) + Number(amt);

        const AddressController = BalanceJunk.find((a) => a.address === from);

        let SaveInscribedData = {};

        SaveInscribedData["id"] = `${txid}i0`;
        SaveInscribedData["tick"] = tick;
        SaveInscribedData["amt"] = Number(amt);
        SaveInscribedData["address"] = from;
        SaveInscribedData["blockNumber"] = block;
        SaveInscribedData["Approved_Contract"] = null;

        InscribedLogsToStore.push(SaveInscribedData);

        if (CheckUserBalanceInJunk) {
          AddressController.holding = AddressController.holding.map((el) => {
            return el.tick !== tick
              ? el
              : {
                  tick: tick,
                  amount: Number(el.amount) - Number(amt),
                  inscribed: Number(el.inscribed) + Number(amt),
                  txid: txid,
                  block: block,
                  id: `${txid}i0`,
                  updateType: el.updateType,
                };
          });
        } else if (CheckUserBalance) {
          if (AddressController) {
            AddressController.holding.push({
              tick: tick,
              amount: UpdatedUserBalance,
              inscribed: UpdatedUserInscribedBalance,
              txid: txid,
              block: block,
              id: `${txid}i0`,
              updateType: "UPDATE_TOKEN_VALUE",
            });
          } else {
            let BalanceUpdate = {};

            BalanceUpdate["address"] = from;
            BalanceUpdate["holding"] = [
              {
                tick: tick,
                amount: UpdatedUserBalance,
                inscribed: UpdatedUserInscribedBalance,
                txid: txid,
                block: block,
                id: `${txid}i0`,
                updateType: "UPDATE_TOKEN_VALUE",
              },
            ];
            BalanceJunk.push(BalanceUpdate);
          }
        }
        EventLogs.push({
          event: config.InscribeTransfer,
          from: from,
          to: "",
          amt: amt,
          id: `${txid}i0`,
          tick: tick,
          block: block,
          time: time,
        });
      } else if (TRC_20_TYPE === config.Approve) {
        const { inscription_id, owner } = decodedData;
        const OwnerFormatTron = HexToTron(owner);

        //the contract caller and contract owner value missmatch
        if (from.toLowerCase() !== OwnerFormatTron.toLowerCase()) continue;

        //Now lets update

        const IsInscribedTransferIdInCache = InscribedLogsToStore.find(
          (a) =>
            a.id.toLowerCase() === inscription_id.toLowerCase() &&
            from.toLowerCase() === a.address.toLowerCase() &&
            a.Approved_Contract === null
        );

        //Already approved to other contract address

        if (IsInscribedTransferIdInCache) {
          IsInscribedTransferIdInCache.Approved_Contract = contractAddress;
        } else {
          //Updated to db
          const Count = await IandA.UpdateInscribeState(
            inscription_id,
            contractAddress,
            from
          );
          if (Count === 0) continue;
        }

        EventLogs.push({
          event: config.Approve,
          from: from,
          to: contractAddress,
          id_approve: `${txid}i0`,
          id: `${inscription_id}`,
          tick: tick,
          block: block,
          time: time,
        });
      } else if (TRC_20_TYPE === config.Transferinscribition) {
        const { sender, receiver, inscription_id } = decodedData;

        //Now lets get the Inscription info from database

        const inscription_info = await IandA.LoadInscribedInfo(
          inscription_id,
          sender,
          contractAddress
        );

        if (!inscription_info) continue;

        const AmountTransfered = inscription_info?.amt;
        const Tick = inscription_info?.tick;

        const IsSenderInCache = BalanceJunk.find(
          (a) => a.address === sender && a.holding.find((b) => b.tick === Tick)
        );
        const IsSenderInDataBase = BalancesDatabase.find(
          (a) => a.address === sender && a.holding.find((b) => b.tick === Tick)
        );

        let SenderController;

        if (IsSenderInCache) {
          SenderController = IsSenderInCache;
        } else {
          SenderController = IsSenderInDataBase;
        }

        if (!SenderController) continue;

        const SellerBalanceForTick = SenderController.holding.find(
          (a) => a.tick === Tick
        );

        //Now lets see the sender Inscribed Balance for the tick
        const InscribedBalance = SellerBalanceForTick?.inscribed;

        if (new Decimal(AmountTransfered).gt(InscribedBalance)) continue;
        //balance is less then amount

        if (IsSenderInCache) {
          const SellerBalanceStoredInJunk = BalanceJunk.find(
            (a) => a.address === sender
          );

          SellerBalanceStoredInJunk.holding =
            SellerBalanceStoredInJunk.holding.map((el) =>
              el.tick !== Tick
                ? el
                : {
                    tick: Tick,
                    amount: Number(el.amount),
                    inscribed: el.inscribed - AmountTransfered,
                    txid: txid,
                    block: block,
                    id: `${txid}i0`,
                    updateType: el.updateType,
                  }
            );
        } else if (IsSenderInDataBase) {
          const IsSenderAddressinCache = BalanceJunk.find(
            (a) => a.address === sender
          );
          if (IsSenderAddressinCache) {
            IsSenderAddressinCache.holding.push({
              tick: Tick,
              amount: SellerBalanceForTick?.amount,
              inscribed:
                Number(SellerBalanceForTick?.inscribed) -
                Number(AmountTransfered),
              txid: txid,
              block: block,
              id: `${txid}i0`,
              updateType: "UPDATE_TOKEN_VALUE",
            });
          } else {
            let BalanceUpdate = {};

            BalanceUpdate["address"] = sender;
            BalanceUpdate["holding"] = [
              {
                tick: Tick,
                amount: SellerBalanceForTick?.amount,
                inscribed:
                  Number(SellerBalanceForTick?.inscribed) -
                  Number(AmountTransfered),
                txid: txid,
                block: block,
                id: `${txid}i0`,
                updateType: "UPDATE_TOKEN_VALUE",
              },
            ];
            BalanceJunk.push(BalanceUpdate);
          }
        } else {
          throw new Error("Sender was not found in database and cahce");
        }

        const IsReceiverInDataBase = BalancesDatabase.find(
          (a) => a.address === receiver
        );

        const IsReceiverInCache = BalanceJunk.find(
          (a) => a.address === receiver
        );

        const ReceiverValue = IsReceiverInDataBase?.holding?.find(
          (a) => a?.tick === Tick
        );

        if (IsReceiverInCache) {
          const isReceiverHoldingSameToken = IsReceiverInCache.holding.find(
            (a) => a.tick === Tick
          );

          if (isReceiverHoldingSameToken) {
            IsReceiverInCache.holding = IsReceiverInCache.holding.map((e) =>
              e.tick !== Tick
                ? e
                : {
                    tick: Tick,
                    amount: Number(e.amount) + Number(AmountTransfered),
                    inscribed: e.inscribed,
                    txid: txid,
                    block: block,
                    id: `${txid}i0`,
                    updateType: e.updateType,
                  }
            );
          } else {
            IsReceiverInCache.holding.push({
              tick: Tick,
              amount: (() => {
                if (IsReceiverInDataBase && !ReceiverValue) {
                  return Number(AmountTransfered);
                } else if (IsReceiverInDataBase && ReceiverValue) {
                  return (
                    Number(ReceiverValue.amount) + Number(AmountTransfered)
                  );
                } else {
                  return Number(AmountTransfered);
                }
              })(),
              inscribed: (() => {
                if (IsReceiverInDataBase && !ReceiverValue) {
                  return Number(0);
                } else if (IsReceiverInDataBase && ReceiverValue) {
                  return Number(ReceiverValue.inscribed);
                } else {
                  return Number(0);
                }
              })(),

              txid: txid,
              block: block,
              id: `${txid}i0`,
              updateType: (() => {
                if (IsReceiverInDataBase && !ReceiverValue) {
                  return "PUSH_NEW_TOKEN";
                } else if (IsReceiverInDataBase && ReceiverValue) {
                  return "UPDATE_TOKEN_VALUE";
                } else {
                  return "CREATE_NEW_WALLET";
                }
              })(),
            });
          }
        } else if (IsReceiverInDataBase) {
          let BalanceUpdate = {};

          BalanceUpdate["address"] = receiver;
          BalanceUpdate["holding"] = [
            {
              tick: Tick,
              amount: (() => {
                if (IsReceiverInDataBase && !ReceiverValue) {
                  return Number(AmountTransfered);
                } else if (IsReceiverInDataBase && ReceiverValue) {
                  return (
                    Number(ReceiverValue.amount) + Number(AmountTransfered)
                  );
                } else {
                  return Number(AmountTransfered);
                }
              })(),
              inscribed: (() => {
                if (IsReceiverInDataBase && !ReceiverValue) {
                  return Number(0);
                } else if (IsReceiverInDataBase && ReceiverValue) {
                  return Number(ReceiverValue.inscribed);
                } else {
                  return Number(0);
                }
              })(),
              txid: txid,
              block: block,
              id: `${txid}i0`,
              updateType: (() => {
                if (IsReceiverInDataBase && !ReceiverValue) {
                  return "PUSH_NEW_TOKEN";
                } else if (IsReceiverInDataBase && ReceiverValue) {
                  return "UPDATE_TOKEN_VALUE";
                } else {
                  return "CREATE_NEW_WALLET";
                }
              })(),
            },
          ];
          BalanceJunk.push(BalanceUpdate);
        } else {
          let BalanceUpdate = {};

          BalanceUpdate["address"] = receiver;
          BalanceUpdate["holding"] = [
            {
              tick: Tick,
              amount: Number(AmountTransfered),
              inscribed: 0,
              txid: txid,
              block: block,
              id: `${txid}i0`,
              updateType: "CREATE_NEW_WALLET",
            },
          ];

          BalanceJunk.push(BalanceUpdate);
        }

        await IandA.DeleteInscribedLogs(inscription_id, sender); //delete the logs once its spent

        EventLogs.push({
          event: config.transfer_event,
          from: sender,
          to: receiver,
          amt: amount,
          id: `${txid}i0`,
          tick: tick,
          block: block,
          time: time,
        });
      }
    }
    if (DeploymentDataToStore.length !== 0) {
      await TokenQuery.BulkWriteTokenDeployment(DeploymentDataToStore);
    }

    if (TokenDeployedCache.length !== 0) {
      const ValidMintedOne = TokenDeployedCache.filter((a) => a.minted !== 0);

      if (ValidMintedOne.length === 0) return;

      await TokenQuery.updateTokenMintState(ValidMintedOne);
    }

    if (InscribedLogsToStore.length !== 0) {
      await IandA.StoreInscribedLogs(InscribedLogsToStore);
    }

    if (BalanceJunk.length !== 0) {
      await BalanceStore.WriteBalanceinBulk(BalanceJunk);
    }

    if (EventLogs.length !== 0) {
      await BalanceStore.StoreLogs(EventLogs);
    }

    return true;
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

module.exports = IndexTronInscribition;
