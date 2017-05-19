export interface ImageResize {
    w?: number;
    h?: number;
    ext?: string;
}
export declare namespace BodyParser {
    interface MultipartOptions {
        returnType?: Object | String;
        returnPath?: string;
        name: string;
        uploadDir?: string;
        maxCount?: number;
        preservePath?: boolean;
        limit?: {
            fieldNameSize?: number;
            fieldSize?: number;
            fields?: number;
            fileSize?: number;
            files?: number;
            parts?: number;
            headerPairs?: number;
        };
        resize?: Array<ImageResize>;
    }
}
export declare function BODYPARSER(opts?: Array<BodyParser.MultipartOptions>): Function;
