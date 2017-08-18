interface IAppConfig {
  externalConfig?: string
  url: string
  name: string
  port?: number
  host?: string
  services?: {
    oauth: string
  }
  encrypt?: {
    pwd?: string
    mode?: Array<'query' | 'body' | 'response'>
    baseOnRequest?: boolean,
  }
  mongo?: any
  proxy?: any
  app: {
    gateway?: any
    suid: string
  }
}

declare const AppConfig: IAppConfig
