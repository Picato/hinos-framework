import { runner } from './Runner'
import Config from './Config'

(async () => {
  for (let config of Config) {
    await runner(config)
  }
})()
