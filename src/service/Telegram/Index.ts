import OrderCommand from "./OrderCommand";
import { User } from "../User";
import AlertCommand from "./AlertCommand";
import MenuCommand from "./MenuCommand";

(async () => {
  await Promise.all([
    User.init(),
    MenuCommand.init(),
    OrderCommand.init(),
    AlertCommand.init()
  ])
  await Promise.all([
    OrderCommand.runBackground(),
    AlertCommand.runBackground()
  ])
})()