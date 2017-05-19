export declare class Checker {
    static is(params: any, type: any, fieldName: any): void;
    static option(fieldName: string, value: any, type: any, fcDone?: Function, fcNoData?: Function): any;
    static must(fieldName: string, value: any, type: any, defaultValue?: any): any;
    static has(value: any): boolean;
}
