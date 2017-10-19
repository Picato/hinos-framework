import Type from './_.type'

class StringType extends Type<string> {
  constructor() {
    super('String', 'string')
  }

}

export default function () {
  return new StringType()
}
