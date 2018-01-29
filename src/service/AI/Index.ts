import { User } from "../User";
import { PDumping } from "./PDumping";

(async () => {
  await Promise.all([
    User.init(),
    PDumping.init()
  ])
  await Promise.all([
    PDumping.runBackground()
  ])
})()