declare namespace SocketIOClient {
  export interface Socket {
    onJson(event: string): Promise<any>;
  }
}
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
    baseOnRequest?: boolean
    helmet?: boolean
  }
  services: {
    oauth: string
    mail: string
    log: string
  }
  app: {
    timeoutSpamMail: number
    timeoutPingService: number
    configs: {
      [projectId: string]: {
        secretKey: string
        mailTo: string[]
        mailConfigId: any
      }
    }
  }
}

declare const AppConfig: IAppConfig
