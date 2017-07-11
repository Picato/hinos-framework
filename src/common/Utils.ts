import * as path from 'path'
import * as fs from 'fs'
import * as archiver from 'archiver'
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
  public static zip(inPath: { path: string, name: string } | { path: string, name: string }[], outPath) {
    return new Promise((resolve, reject) => {
      var archive = archiver('zip', {
        zlib: { level: 9 }
      })
      const output = fs.createWriteStream(path.join(__dirname, '..', '..', outPath))
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)
      if (inPath instanceof Array) {
        for (const p of inPath) {
          archive = archive.append(fs.createReadStream(path.join(__dirname, '..', '..', p.path)), { name: p.name })
        }
      } else {
        archive = archive.append(fs.createReadStream(path.join(__dirname, '..', '..', inPath.path)), { name: inPath.name })
      }
      archive.finalize()
    })
  }
}