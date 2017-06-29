import type from './_.type'
import * as _ from 'lodash'

class ArrayType extends type<any> {
  //Publish
  public static required(required: boolean = true) {
    const b = new ArrayType()
    return b.required(required)
  }
  public static schema(_schema: any) {
    const b = new ArrayType()
    return b.schema(_schema)
  }
  public static default(dfValue: Array<any>) {
    const b = new ArrayType()
    return b.default(dfValue)
  }

  public _schema: any

  constructor() {
    super('Array', 'Array')
  }

  public schema(_schema: any) {
    this._schema = _schema
    let beanType = []
    _.forOwn(this._schema, (fieldType, fieldName) => {
      if (typeof fieldType === 'function') {
        this._schema[fieldName] = fieldType = fieldType.required()
      }
      fieldType.fieldName = fieldName
      beanType.push(`${fieldName}?: ${fieldType.beanType}`)
    })
    this.beanType = `${this.beanType}<{${beanType.join('\n')}}>`
    return this
  }

  // Service
  public validateInsert(item) {
    return this.validate(item, 0)
  }
  public validateUpdate(item) {
    return this.validate(item, 1)
  }

  private checkWhenHas(item, type: number) {
    let rs = []
    _.forOwn(this._schema, (fieldType, fieldName1) => {
      fieldType.fieldName = fieldName1
      if (type === 0) {
        if (fieldType.validateInsert) rs.push(fieldType.validateInsert(`${this.fieldName}`))
      } else {
        if (fieldType.validateUpdate) rs.push(fieldType.validateUpdate(`${this.fieldName}`))
      }
    })
    if (rs.length > 0) {
      return `${item ? `${item}.` : ''}${this.fieldName} = ${item ? `${item}.` : ''}${this.fieldName}.map((${this.fieldName}, i) => {
                ${rs.join('\n')}
                return ${this.fieldName}
            })`
    }
    return ''
  }
  private validate(item, t) {
    let cnt = ''
    if (t === 1) {
      if (!this._schema) cnt = `Checker.option(${item ? `${item}` : ''}, '${this.fieldName}', Array)`
      else cnt = `Checker.option(${item ? `${item}` : ''}${this.fieldName},'${this.fieldName}',  Array, (${this.fieldName})=>{${this.checkWhenHas(item, t)}})`
    } else {
      if (this._dfValue) {
        cnt = `Checker.option(${item ? `${item}` : ''}, '${this.fieldName}', Array, ${type.ostringify(this._dfValue, null, '\t')})`
        if (this._schema) cnt += this.checkWhenHas(`${item}`, t)
      } else {
        if (this._required) {
          cnt = `Checker.required(${item ? `${item}` : ''}, '${this.fieldName}', Array)`
          if (this._schema) cnt += this.checkWhenHas(`${item}`, t)
        } else {
          if (this._schema)
            cnt = `Checker.option(${item ? `${item}` : ''}, '${this.fieldName}', Array, undefined, (${this.fieldName})=>{${this.checkWhenHas(item, t)}})`
          else
            cnt = `Checker.option(${item ? `${item}` : ''}, '${this.fieldName}', Array)`
        }
      }
    }
    return cnt
  }


}
const object = ArrayType
export default object