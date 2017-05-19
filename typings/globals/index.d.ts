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
    rabbitmq?: {
        url: string;
        releaseTimeout?: number;
        queue: {
            API_SENDER: string,
            API_RECEIVER: string
        }
    };
    app: any
}

declare const AppConfig: IAppConfig;