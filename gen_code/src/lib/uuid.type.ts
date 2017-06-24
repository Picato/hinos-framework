import type from './_.type'

class UuidType extends type<string> {

  constructor() {
    super('Uuid', 'Uuid')
  }

  public static required(required: boolean = true) {
    const b = new UuidType()
    return b.required(required)
  }

  public assignInController() {
    return `${this.fieldName}: Mongo.uuid`
  }
  public assignUpController() {
    return `${this.fieldName}: Mongo.uuid`
  }

}
const uuid = UuidType
export default uuid