import OrderCommand from "./OrderCommand";
import { User } from "../User";

(async () => {
  await User.init()
  await OrderCommand.init()
})()