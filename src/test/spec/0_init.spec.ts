import { use, expect } from 'chai';
import { Http } from 'hinos-common';
import { httpMatcher } from '../helpers/http.matcher';

declare let global: any;

global.Http = Http;
global.expect = expect;

use(httpMatcher);

before(async function (){
	console.info(`☸ ☸ ☸ ☸ Unit test ☸ ☸ ☸ ☸`);
	
	Http.headers = {
		'content-type': 'application/json'
	}
		
});

after(function () {
	console.info(`☸ ☸ ☸ ☸ ☸ ☸ ☸ ☸ ☸ ☸ ☸ ☸`);
})