import { ALL } from 'hinos-route'
import { GatewayService } from '../service/GatewayService'

/************************************************
 ** GatewayController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class GatewayController {

  @ALL(/^\/([^\/]+)/i)
  static async gateway(ctx) {
    ctx.params.service = ctx.params[0].split('/')[0].toLowerCase()
    return await GatewayService.forward(ctx)
  }

}
