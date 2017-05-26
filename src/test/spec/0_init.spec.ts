import '../../config';
import { use, expect } from 'chai';
import { Http } from 'hinos-common/Http';
import { httpMatcher } from '../helpers/http.matcher';
import { Mongo } from 'hinos-mongo';

declare let global: any;

global.Http = Http;
global.expect = expect;

use(httpMatcher);

before(async function () {
	console.info(`☸ ☸ ☸ ☸ Unit test ☸ ☸ ☸ ☸`);
	Mongo(AppConfig.mongo);

	AppConfig.cuz = {};
	Http.headers = {		
		'content-type': 'application/json'
	}	
	// Init something here	
});

after(function () {
	console.info(`☸ ☸ ☸ ☸ ☸ ☸ ☸ ☸ ☸ ☸ ☸ ☸`);
})