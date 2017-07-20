interface IAppConfig {
    externalConfig?: string;
    url: string;
    name: string;
    port?: number;
    host?: string;
    gateway?: any;
    services?: {
        oauth: string
    }
    encryptKey?: string;
    timeScan?: number;
    mongo?: any;
    app: {

    }
}

declare const AppConfig: IAppConfig;