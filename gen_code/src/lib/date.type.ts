import type from './_.type';

class DateType extends type<string | number> {
    //Publish
    public static required(required: boolean=true){
        const b = new DateType();
        return b.required(required);
    }
    public static default(dfValue: string | number){
        const b = new DateType();
        return b.default(dfValue);
    }
    public static auto(dfValue: string) {
        const b = new DateType();
        return b.required(false).default(dfValue);
    }
    // End Publish

    constructor() {
        super('Date');
    }

    public auto(dfValue: string) {
        this._dfValue = dfValue;
        return this;
    }

    // Controller
    public assignUpController() {
        if (this._dfValue && (new RegExp(this._dfValue.toString()).test('insert') || new RegExp(this._dfValue.toString()).test('update'))) return null;
        return super.assignUpController();
    }
    public assignInController() {
        if (this._dfValue && (new RegExp(this._dfValue.toString()).test('insert') || new RegExp(this._dfValue.toString()).test('update'))) return null;
        return super.assignInController();
    }

    // Service
    public validateInsert(item) {
        if (this._dfValue && new RegExp(this._dfValue.toString()).test('insert'))
            return `${item}.${this.fieldName} = new Date();`;
        return super.validateInsert(item);
    }
    public validateUpdate(item) {
        if (this._dfValue && new RegExp(this._dfValue.toString()).test('update'))
            return `${item}.${this.fieldName} = new Date();`;
        return super.validateUpdate(item);
    }

}
const date = DateType;
export default date;