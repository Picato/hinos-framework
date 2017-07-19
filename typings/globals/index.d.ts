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
    },
    app: {
        suid: string
    }
}

declare const AppConfig: IAppConfig;