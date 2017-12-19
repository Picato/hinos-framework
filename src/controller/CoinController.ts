import { GET } from 'hinos-route';
import { CoinService } from '../service/CoinService';

/************************************************
 ** GoldController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export default class CoinController {

  @GET('/checking-coin')
  static async sync() {
    return await CoinService.getCoinChecking();
  }

}