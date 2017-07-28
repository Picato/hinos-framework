import { GET } from 'hinos-route'
import * as fs from 'fs'

/************************************************
 ** ConfigController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class GUIController {

  @GET('/GUI')
  static async getGUI() {
    return fs.createReadStream('./assets/GUI.zip')
  }

  @GET('/Routes')
  static async getRoutes() {
    return AppConfig.routes
  }

}
