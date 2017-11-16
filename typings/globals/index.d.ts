interface IAppConfig {
  externalConfig?: string
  url: string
  path: string
  name: string
  port?: number
  host?: string
  services?: {
    oauth: string
  }
  encrypt?: {
    pwd?: string
    mode?: Array<'query' | 'body' | 'response'>
    baseOnRequest?: boolean
    helmet?: boolean
  }
  mongo?: any
  proxy?: any
  app: {
    gateway?: any
    suid: string
  }
}

declare const AppConfig: IAppConfig
