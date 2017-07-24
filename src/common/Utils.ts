import * as path from 'path'
import * as fs from 'fs'
import { ImageResize } from 'hinos-bodyparser'

export default class Utils {
  private static getAssetPath(...path) {
    return path.join(path.indexOf('assets') === 0 ? '' : 'assets', ...path)
  }
  public static getUploadFile(assetPath: string) {
    return Utils.getAssetPath(assetPath)
  }
  public static deleteUploadFiles(files: string | string[], sizes?: ImageResize[]): void {
    if (!files) return
    const remove = (f: string, sizes?: ImageResize[]) => {
      try {
        fs.statSync(f)
        fs.unlinkSync(f)
      } catch (e) { /*File was removed before that*/ }
      if (sizes) {
        for (let s of sizes) {
          if (s.ext) remove(f.substr(0, f.lastIndexOf('.') + 1) + s.ext + f.substr(f.lastIndexOf('.')))
        }
      }
    }
    if (!(files instanceof Array)) return remove(Utils.getAssetPath(files.split('?')[0]), sizes)
    for (let f of files) {
      remove(Utils.getAssetPath(f.split('?')[0]), sizes)
    }
  }
}
