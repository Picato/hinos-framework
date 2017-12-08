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
  encrypt?: {
    pwd?: string
    mode?: Array<'query' | 'body' | 'response'>
    type?: 'rsa' | 'blowfish'
    baseOnRequest?: boolean
    helmet?: boolean
  }
  app: {
    bittrex: {
      scanCurrency: number
      apikey: string
      apisecret: string
    },
    gold: {
      scanTimeout: number
    }
  }
}

declare const AppConfig: IAppConfig