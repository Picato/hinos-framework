import Type from './_.type'

class FileType extends Type<any> {

  public _config: any
  public gdataType

  constructor() {
    super('String', 'string')
  }

  public config(_config: any) {
    this._config = _config
    if (this._config.returnType) {
      this.dataType = this._config.returnType.name
      this.gdataType = this._config.returnType.name.toLowerCase()
    }
    if (this._config.length > 1) {
      this.dataType = 'Array'
    }
    return this
  }

  // Service
  public validateInsert(item) {
    if (this._dfValue) return `Checker.option(${item ? `${item}` : ''}, '${this.fieldName}', ${this.dataType}, ${this._dfValue})`
    if (!this._required) return `Checker.option(${item ? `${item}` : ''}, '${this.fieldName}', ${this.dataType})`
    return `Checker.required(${item ? `${item}` : ''}, '${this.fieldName}', ${this.dataType})`
  }
  public validateUpdate(item) {
    return `Checker.option(${item ? `${item}` : ''}, '${this.fieldName}', ${this.dataType})`
  }
  public genBeanCollection() {
    return `${this.fieldName}?: ${this.dataType}<${this.gdataType}>`
  }
}

export default function () {
  return new FileType()
}
