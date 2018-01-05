export default class Utils {
  static JSONParse(data: string) {
    return JSON.parse(data, function (_key, value) {
      if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
          return new Date(value)
        }
      }
      return value
    })
  }
}
