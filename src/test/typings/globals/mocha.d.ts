declare namespace Chai {
    export interface TypeComparison {
        http(a:number|number[]):Chai.Assertion;
    }
}

declare const expect: Chai.ExpectStatic;