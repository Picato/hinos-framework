import Type from './_.type'

class KeyType extends Type<string> {

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
    return `${item ? `${item}.` : ''}${this.fieldName} = Mongo.uuid() as ${this.dataType}`
  }
  public validateUpdate(item) {
    return `Checker.required(${item ? `${item}` : ''}, '${this.fieldName}', ${this.dataType})`
  }
}

export default function () {
  return new KeyType()
}
