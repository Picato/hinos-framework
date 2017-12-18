import * as chalk from 'chalk'

export function DELAY(time: number, des?: string) {
  return {
    url: '',
    method: '',
    requestPath: '',
    executeTime: time,
    title: `******* WAITING ${des ? `: ${des} ` : ''}*******`,
    nvm: true,
    load() { },
    run({ c }) {
      console.log(' ', c, chalk.yellow.bold(this.title), chalk.blue(`(${this.executeTime} ms)`))
      return new Promise((resolve) => {
        setTimeout(resolve, time)
      })
    }
  }
}