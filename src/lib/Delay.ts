export function DELAY(time: number, des?: string) {
  return {
    url: '',
    method: '',
    requestPath: '',
    executeTime: time,
    title: `******* DELAYED ${des ? `: ${des} ` : ''}*******`,
    nvm: true,
    load() { },
    run() {
      return new Promise((resolve) => {
        setTimeout(resolve, time)
      })
    }
  }
}