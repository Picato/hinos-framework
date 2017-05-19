import type from './_.type';

class FileType extends type<any> {
    //Publish
    public static required(required: boolean=true){
        const b = new FileType();
        return b.required(required);
    }
    public static config(_config: any){
        const b = new FileType();
        return b.config(_config);
    }

    public _config: any;
    public gdataType;
    constructor() {
        super('String', 'string');
    }

    public config(_config: any) {
        this._config = _config;
        if(this._config.returnType) {
            this.dataType = this._config.returnType.name;
            this.gdataType = this._config.returnType.name.toLowerCase();
        }
        if(this._config.length > 1){
            this.dataType = 'Array';
        }
        return this;
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
        return `${this.fieldName}?: ${this.dataType}<${this.gdataType}>;`;
    }

}
const file = FileType;
export default file;