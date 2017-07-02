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
    redis?: {
        host: string;
        port: number;
        db?: string;
        releaseTimeout?: number;
    };
    encryptKey?: string;
    services: {
        oauth: string
    },
    app: {
        scanTimeout: number
    }
}

declare const AppConfig: IAppConfig;