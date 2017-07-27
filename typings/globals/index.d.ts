interface IAppConfig {
    externalConfig?: string
    url: string
    name: string
    port?: number
    host?: string    
    services?: {
        oauth: string
    }
    encryptKey?: string
    mongo?: any
    proxy?: any
    app: {
        gateway?: any
        suid: string
    }
}

declare const AppConfig: IAppConfig