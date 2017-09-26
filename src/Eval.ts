export class Var {
  constructor(public name) { }
  toString() {
    return '${$var.' + this.name + '}'
  }
}
export function $var(name) {
  return new Var(name)
}

export class Url {
  vars: (Var | string)[]
  constructor(public url, ..._vars: (Var | string)[]) {
    this.vars = _vars
  }
  toString() {
    return this.url
  }
}
export function $url(url, ...vars: (Var | string)[]) {
  return new Url(url, ...vars)
}
