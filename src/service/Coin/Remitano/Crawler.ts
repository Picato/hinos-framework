import { REDIS, Redis } from "hinos-redis/lib/redis";
import { MONGO, Mongo, Collection } from "hinos-mongo/lib/mongo";

const phantom = require('phantom');

@Collection()
export class RemitanoRate {
  currency: 'VND',
  btc_bid: 288387000,
  btc_ask: 294204467.52,
  eth_bid: 26550909,
  eth_ask: 26926057.125,
  usdt_bid: 27324,
  usdt_ask: 26159
}

export class RemitanoCrawler {

  @MONGO('coin')
  protected mongo: Mongo

  init() {
    const self = this
    setInterval(() => {
      self.scan.apply(self)
    }, 10000)
  }

  async scan() {
    const instance = await phantom.create();
    const page = await instance.createPage();
    await page.on('onResourceRequested', function (requestData) {
      console.info('Requesting', requestData.url);
    });

    const status = await page.open('https://usdt.remitano.com/vn');
    if (status === 200) {
      const content = await page.property('content');
      const m = content.match(/"btc_rates":.*?"vn":(\{[^\}]+\})/)
      const rate = JSON.parse(m[1])
      this.mongo.insert(RemitanoRate, {

      })
      await instance.exit();
    }
  }
}