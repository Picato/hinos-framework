import { ProjectService } from './ProjectService'
import { AccountService } from './AccountService'

export default async function startup() {
  await Promise.all([
    ProjectService.loadIntoCached(),
    AccountService.loadIntoCached()
  ])
}
