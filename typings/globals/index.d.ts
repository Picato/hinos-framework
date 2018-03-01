interface IAppConfig {
  env: 'production' | 'development'
  url: string
  path: string
  name: string
  port?: number
  host?: string
  mongo?: {
    url: string
    releaseTimeout?: number
  }
  services: {
    oauth: string
  }
  cors: {
    allowMethods?: string[] | string;
    exposeHeaders?: string[] | string;
    allowHeaders?: string[] | string;
    origin?: Function | string;
    maxAge?: number | string;
    credentials?: boolean;
    keepHeadersOnError?: boolean;
  },
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
