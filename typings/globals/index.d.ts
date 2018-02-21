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
  mongo?: any
  proxy?: any
  app: {
    gateway?: any
    suid: string
  }
}

declare const AppConfig: IAppConfig
