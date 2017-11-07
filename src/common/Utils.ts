import * as path from 'path'

export default class Utils {

  public static async executeCmd(cmd: string) {
    return new Promise((resolve, reject) => {
      const exec = require('child_process').exec
      exec(cmd, function callback(error) {
        if (error) return reject(error)
        resolve()
      });
    })
  }

  public static zipFolder(input: string, output: string) {
    return new Promise((resolve, reject) => {
      const zipFolder = require('zip-folder')
      zipFolder(input, output, function (err) {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  public static removeFolder(input: string) {
    return new Promise((resolve, reject) => {
      const rimraf = require('rimraf')
      rimraf(input, function (err) {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  static getAssetPath(...paths: string[]) {
    return path.join(paths.indexOf('assets') === 0 ? '' : 'assets', ...paths)
  }

  static getTempPath(...paths: string[]) {
    const tmp = require('os').tmpdir()
    return path.join(tmp, ...paths)
  }

}
