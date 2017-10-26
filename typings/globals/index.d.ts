interface IAppConfig {
  externalConfig?: string
  url: string
  path: string
  name: string
  port?: number
  host?: string
  routes?: Array<any>
  mongo?: {
    url: string
    releaseTimeout?: number
  }
  redis?: {
    host: string
    port: number
    db?: string
    releaseTimeout?: number
  }
  encrypt?: {
    pwd?: string
    mode?: Array<'query' | 'body' | 'response'>
    baseOnRequest?: boolean
  }
  services: {
    oauth: string
  }
  app: {
    scanTimeout: number,
    retrySending: number
  }
}

declare const AppConfig: IAppConfig
