import Type from './_.type'

class BooleanType extends Type<boolean> {
  constructor() {
    super('Boolean', 'boolean')
  }

}

export default function () {
  return new BooleanType()
}
