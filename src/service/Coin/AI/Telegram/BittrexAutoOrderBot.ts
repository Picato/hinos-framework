// import { Redis } from "hinos-redis/lib/redis";
// import { TradingTemp } from "../../Crawler/RawHandler";



// class OrderBot {
//   orders = {} as { [key: string]: Order[] }

//   init() {
//     const self = this
//     Redis.subscribe('updateData', (data) => {
//       const { tradings } = JSON.parse(data)
//       self.checkOrder(tradings)
//     }, AppConfig.redis)
//   }

//   add(market: string, quantity: number, price: number, rate: number, type: 'buy' | 'sell', userId, chatId, messageId) {
//     if (!this.orders[market]) this.orders[market] = []
//     this.orders[market].push(new Order(market, quantity, price, rate, type, userId, chatId, messageId))
//   }

//   checkOrder(tradings: TradingTemp[]) {
//     for (let key in this.orders) {
//       for (let o of this.orders[key]) {
//         const tr = tradings.find(e => e.key === key)
//         if (o.canBeOrder(tr.last)) {
//           console.log('buy')
//         }
//       }
//     }
//   }
// }

// export default new OrderBot()
