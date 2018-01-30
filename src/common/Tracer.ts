import Logger from "./Logger";

export function enumerable(value: boolean) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    descriptor.enumerable = value;
  };
}

export function TRACE(): Function {
  return (_target: Function, fieldName: string, func: TypedPropertyDescriptor<Function>) => {
    const baseMethod = func.value
    func.value = async function (...args) {
      const className = this.name || this.constructor.name
      // Logger.trace('START', `${className}.${fieldName}`)
      const begin = new Date().getTime()
      try {
        return await baseMethod.call(this, ...args)
      } catch (e) {
        Logger.error(`${className}.${fieldName}`, e)
        throw e
      } finally {
        Logger.trace(`${className}.${fieldName}`, `- ${new Date().getTime() - begin}ms`)
      }
    }
    return func
  }
}