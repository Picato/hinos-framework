declare namespace SocketIOClient {
  export interface Socket {
    onJson(event: string): Promise<any>;
  }
}
interface IAppConfig {
  externalConfig?: string;
  url: string;
  name: string;
  port?: number;
  host?: string;
  mongo?: {
    url: string;
    releaseTimeout?: number;
  };
  encrypt?: {
    pwd?: string
    mode?: Array<'query' | 'body' | 'response'>
    type?: 'rsa' | 'blowfish'
    baseOnRequest?: boolean
  }
  services: {
    oauth: string
    mail: string
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

declare const AppConfig: IAppConfig;
