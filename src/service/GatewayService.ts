import * as httpProxy from 'http-proxy'

const proxy = httpProxy.createProxyServer()

export class GatewayService {

  static forward({ req, res, params }) {
    return new Promise((resolve, reject) => {
      proxy.web(req, res, { target: AppConfig.gateway[params.service] }, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

}