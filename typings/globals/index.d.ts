interface IAppConfig {
    externalConfig?: string;
    url: string;
    name: string;
    port?: number;
    host?: string;
    gateway?: {
        files: string
        mail: string
        oauth: string
        log: string
    }
    encryptKey?: string;
    app: {
        
    }
}

declare const AppConfig: IAppConfig;