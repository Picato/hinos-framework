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
    },
    app: {
        
    }
}

declare const AppConfig: IAppConfig;