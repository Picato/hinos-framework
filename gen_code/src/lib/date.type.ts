import Type from './_.type'

class DateType extends Type<string | number> {

  constructor() {
    super('Date')
  }

  public auto(dfValue: string) {
    this._dfValue = dfValue
    return this
  }

  // Controller
  public assignUpController() {
    if (this._dfValue && (new RegExp(this._dfValue.toString()).test('insert') || new RegExp(this._dfValue.toString()).test('update'))) return null
    return super.assignUpController()
  }
  public assignInController() {
    if (this._dfValue && (new RegExp(this._dfValue.toString()).test('insert') || new RegExp(this._dfValue.toString()).test('update'))) return null
    return super.assignInController()
  }

  // Service
  public validateInsert(item) {
    if (this._dfValue && new RegExp(this._dfValue.toString()).test('insert')) return `${item}.${this.fieldName} = new Date()`
    if (this._dfValue && new RegExp(this._dfValue.toString()).test('update')) return `${item}.${this.fieldName} = new Date()`
    return super.validateInsert(item)
  }
  public validateUpdate(item) {
    if (this._dfValue && new RegExp(this._dfValue.toString()).test('update')) return `${item}.${this.fieldName} = new Date()`
    return super.validateUpdate(item)
  }
}

export default function () {
  return new DateType()
}
