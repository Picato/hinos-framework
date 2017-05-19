import type from './_.type';

class BooleanType extends type<boolean> {
    constructor(){
        super('Boolean', 'boolean');
    }
    
    public static required(required: boolean=true){
        const b = new BooleanType();
        return b.required(required);
    }

    public static default(dfValue: boolean){
        const b = new BooleanType();
        return b.default(dfValue);
    }

}
const boolean = BooleanType;
export default boolean;