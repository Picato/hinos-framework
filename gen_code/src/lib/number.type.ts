import type from './_.type';

class NumberType extends type<number> {
    constructor(){
        super('Number', 'number');
    }
    public static required(required: boolean=true){
        const b = new NumberType();
        return b.required(required);
    }

    public static default(dfValue: number){
        const b = new NumberType();
        return b.default(dfValue);
    }
}
const number = NumberType;
export default number;