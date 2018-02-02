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
  rabbitmq?: {
    url: string
    releaseTimeout?: number
    queue: {
      API_SENDER: string
      API_RECEIVER: string
      LOG_RECEIVER: string
    }
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
    type?: 'rsa' | 'blowfish'
    baseOnRequest?: boolean
    helmet?: boolean
  }
  app: {
    telegram: {
      OrderBot: string
      AlertBot: string
      MenuBot: string
    }
    bittrex: {
      scanTimeout: number
      scanRemitano: number
    }
  }
}

declare const AppConfig: IAppConfig