/// <reference path="../../../../typings/globals/index.d.ts" />
/// <reference path="./appconfig.d.ts" />
/// <reference path="./mocha.d.ts" />
/// <reference path="../../../../node_modules/hinos-common/Http.d.ts" />

// declare const AppConfig: IAppConfig;

declare class Axios {
    static headers: any;
    static head(url: string, opts?): Promise<{ data: any, status: number, statusText: string, headers: any }>;
    static delete(url: string, opts?): Promise<{ data: any, status: number, statusText: string, headers: any }>;
    static get(url: string, opts?): Promise<{ data: any, status: number, statusText: string, headers: any }>;
    static post(url: string, opts?): Promise<{ data: any, status: number, statusText: string, headers: any }>;
    static put(url: string, opts?): Promise<{ data: any, status: number, statusText: string, headers: any }>;
    static patch(url: string, opts?): Promise<{ data: any, status: number, statusText: string, headers: any }>;
}
