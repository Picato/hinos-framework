import * as _ from 'lodash';

export default class type<T> {
    public fieldName: string;
    protected _required: boolean = true;
    protected _dfValue: T;
    constructor(protected dataType: string, protected beanType?: string) {
        if(!this.beanType) this.beanType = this.dataType;
    }

    public static ostringify = (a, b?, c?) => {
        if(_.isNil(a)) return a;
        return JSON.stringify(a, b, c).replace(/\"([^(\")"]+)\":/g, "$1:").replace(/"?\$Native\(([^\)]+)\)"?/g, '$1');
    }

    public static required(required: boolean=true){

    }

    public required(required: boolean=true){
        this._required = required;
        return this;
    }

    public default(dfValue: T){
        this._dfValue = dfValue;
        return this;
    }

    public toString() {
        let rs = [];
        rs.push(this.assignInController());
        rs.push(this.assignUpController());
        rs.push(this.validateInsert('body'));
        rs.push(this.validateUpdate('body'));
        rs.push(this.genBeanCollection());
        return rs.join('\n');
    }

    // Controller
    public assignUpController() {
        return `${this.fieldName}: ${this.dataType}`;
    }
    public assignInController() {
        return `${this.fieldName}: ${this.dataType}`;
    }

    // Service
    public validateInsert(item) {
        if (this._dfValue) return `Checker.must('${this.fieldName}', ${item ? `${item}.` : ''}${this.fieldName}, ${this.dataType}, ${this._dfValue});`;    
        if (!this._required) return `Checker.option('${this.fieldName}', ${item ? `${item}.` : ''}${this.fieldName}, ${this.dataType});`;
        return `Checker.must('${this.fieldName}', ${item ? `${item}.` : ''}${this.fieldName}, ${this.dataType});`;
    }
    public validateUpdate(item) {
        return `Checker.option('${this.fieldName}', ${item ? `${item}.` : ''}${this.fieldName}, ${this.dataType});`;
    }
    public genBeanCollection() {
        return `${this.fieldName}?: ${this.beanType};`;
    }

    // Spec
    public genSpecField(){
        return `${this.fieldName}${this._required ? '' : '?'}: ${this.beanType}`;
    }

    // Http
    public genHttpField(){
        return `${this.fieldName}${this._required ? '' : '?'}: ${this.beanType}`;
    }

}