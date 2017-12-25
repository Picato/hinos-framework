// import * as bittrex from 'node.bittrex.api'

// bittrex.websockets.client(function () {
//   console.log('Websocket connected');
//   bittrex.websockets.subscribe(['BTC-ETH'], function (data) {
//     if (data.M === 'updateExchangeState') {
//       data.A.forEach(function (data_for) {
//         console.log('Market Update for ' + data_for.MarketName, data_for);
//       });
//     }
//   });
// });

import { CoinTrending } from './service/CoinTrending'
CoinTrending.checking()