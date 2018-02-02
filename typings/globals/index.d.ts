interface IAppConfig {
  externalConfig?: string
  url: string
  path: string
  name: string
  port?: number
  host?: string
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
  services: {
    oauth: string
  }
  log?: {
    appenders?: {
      [appenderName: string]: {
        type: string,
        filename: string
      }
    },
    categories?: {
      default: {
        appenders: string[],
        level: "all" | "error" | "debug" | "fatal" | "info" | "trace" | "warn"
      }
    }
  }
  encrypt?: {
    pwd?: string
    mode?: Array<'query' | 'body' | 'response'>
    baseOnRequest?: boolean
    helmet?: boolean
  }
  app: {

  }
}

declare const AppConfig: IAppConfig
