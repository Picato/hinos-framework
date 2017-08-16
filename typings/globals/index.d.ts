interface IAppConfig {
  externalConfig?: string
  url: string
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
  encrypt?: {
    pwd?: string
    mode?: Array<'query' | 'body' | 'response'>
    type?: 'rsa' | 'blowfish'
    baseOnRequest?: boolean
  }
  app: {

  }
}

declare const AppConfig: IAppConfig