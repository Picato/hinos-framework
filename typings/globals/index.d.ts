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
    routes?: any;
    mongo?: {
        url: string;
        releaseTimeout?: number;
    };
    redis?: {
        host: string;
        port: number;
        db?: string;
        releaseTimeout?: number;
    };
    encryptKey?: string;
    services: {
        oauth: string
        mail: string
    },
    app: {
        wsSession: string
        timeoutSpamMail: number
        mailConfig: {
            secretKey: string,
            mailTo: string[],
            mailConfigId: any
        }
    }
}

declare const AppConfig: IAppConfig;