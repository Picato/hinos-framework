interface IAppConfig {
  externalConfig?: string
  url: string
  name: string
  port?: number
  host?: string
  routes?: Array<any>
  mongo?: {
    url: string
    releaseTimeout?: number
  }
  encrypt?: {
    pwd?: string
    mode?: Array<'query' | 'body' | 'response'>
    type?: 'rsa' | 'blowfish'
    baseOnRequest?: boolean
  }
  services: {
    oauth: string
  }
  app: {

  }
}

declare const AppConfig: IAppConfig
