import Type from './_.type'

class NumberType extends Type<number> {
  constructor() {
    super('Number', 'number')
  }

}

export default function () {
  return new NumberType()
}
