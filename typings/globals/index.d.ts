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
  encrypt?: {
    pwd?: string
    mode?: Array<'query' | 'body' | 'response'>
    baseOnRequest?: boolean
  }
  services: {
    oauth: string
  }
  app: {

  }
}

declare const AppConfig: IAppConfig
