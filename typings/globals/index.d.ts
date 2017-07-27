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
    encryptKey?: string;
    services: {
        oauth: string
        mail: string
    },
    app: {
        timeoutSpamMail: number
        timeoutPingService: number
        configs: {
            [projectId: string]: {
                secretKey: string,
                mailTo: string[],
                mailConfigId: any
            }
        }
    }
}

declare const AppConfig: IAppConfig;