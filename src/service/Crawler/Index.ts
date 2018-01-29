import RawTrading from "./RawHandler";
import RemitanoHandler from "./RemitanoHandler";

(async () => {
  await Promise.all([
    await RawTrading.init(),
    await RemitanoHandler.init()
  ])
})()