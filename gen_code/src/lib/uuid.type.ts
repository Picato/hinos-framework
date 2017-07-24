import Type from './_.type'

class UuidType extends Type<string> {

  constructor() {
    super('Uuid', 'Uuid')
  }

  public assignInController() {
    return `${this.fieldName}: Mongo.uuid`
  }
  public assignUpController() {
    return `${this.fieldName}: Mongo.uuid`
  }
}

export default function () {
  return new UuidType()
}
