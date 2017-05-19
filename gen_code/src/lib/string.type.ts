import type from './_.type';

class StringType extends type<string> {
    constructor(){
        super('String', 'string');
    }

    public static required(required: boolean=true){
        const b = new StringType();
        return b.required(required);
    }

    public static default(dfValue: string){
        const b = new StringType();
        return b.default(dfValue);
    }
}
const string = StringType;
export default string;