import { ProjectService } from './ProjectService'
import { AccountService } from './AccountService'

export default function startup() {
  ProjectService.loadIntoCached()
  AccountService.loadIntoCached()
}
