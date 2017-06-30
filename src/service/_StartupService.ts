import { ProjectService } from "./ProjectService"
import { AccountService } from "./AccountService"

export default async function startup() {
  await ProjectService.loadIntoCached()
  await AccountService.loadIntoCached()
}