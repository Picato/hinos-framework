import * as path from 'path'
import * as fs from 'fs'
import { ImageResize } from 'hinos-bodyparser'

export default class Utils {
  public static getUploadFile(assetPath: string) {
    return path.join(__dirname, '..', '..', 'assets', assetPath)
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
    if (!(files instanceof Array)) return remove(path.join(__dirname, '..', '..', 'assets', files.split('?')[0]), sizes)
    for (let f of files) {
      remove(path.join(__dirname, '..', '..', 'assets', f.split('?')[0]), sizes)
    }
  }
}