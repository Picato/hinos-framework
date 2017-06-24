import type from './_.type'

class KeyType extends type<string> {

  constructor() {
    super('Uuid')
  }

  public assignInController() {
    return null
  }
  public assignUpController() {
    return null
  }

  public validateInsert(item) {
    return `${item ? `${item}.` : ''}${this.fieldName} = <${this.dataType}>Mongo.uuid()`
  }
  public validateUpdate(item) {
    return `Checker.must('${this.fieldName}', ${item ? `${item}.` : ''}${this.fieldName}, ${this.dataType})`
  }

}
const key = new KeyType()
export default key