export function VALIDATE(fc: Function, autoCall: boolean = true): Function {
    return (target: Object, fieldName: String, func: TypedPropertyDescriptor<Function>) => {
        const baseMethod = func.value;
        func.value = async (...args) => {
            if (autoCall) fc(...args);
            await baseMethod(...args, fc);
        }
        return func;
    };
}