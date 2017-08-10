import * as path from 'path'
import * as fs from 'fs'
import * as archiver from 'archiver'
import { ImageResize } from 'hinos-bodyparser/file'

export default class Utils {

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
    if (!(files instanceof Array)) return remove(Utils.getAssetPath(files.split('?')[0]) as string, sizes)
    for (let f of files) {
      remove(Utils.getAssetPath(f.split('?')[0]) as string, sizes)
    }
  }

  public static zip(inPath: { path: string, name: string } | { path: string, name: string }[], outPath: string) {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 9 }
      })
      const output = fs.createWriteStream(Utils.getAssetPath(outPath) as string)
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)
      if (inPath instanceof Array) {
        for (const p of inPath) {
          archive.append(fs.createReadStream(Utils.getAssetPath(p.path) as string), { name: p.name })
        }
      } else {
        archive.append(fs.createReadStream(Utils.getAssetPath(inPath.path) as string), { name: inPath.name })
      }
      archive.finalize()
    })
  }

  private static getAssetPath(paths: string | string[]) {
    if (paths instanceof Array) return paths.map(e => path.join(e.indexOf('assets') === 0 ? '' : 'assets', e))
    if (paths.indexOf('assets') === 0) return paths
    return path.join('assets', paths)
  }

}
