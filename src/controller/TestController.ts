import * as path from 'path';
import {
	GET,
	POST,
	PUT,
	DELETE,
	HEAD,
	INJECT
} from 'hinos-route';
import {
	BODYPARSER
} from 'hinos-bodyparser';
import {
	MATCHER
} from 'hinos-requestmatcher';
import {
	Mongo
} from 'hinos-mongo';
import {
	Test,
	TestService
} from '../service/TestService';
import {
	authoriz
} from '../service/Authoriz'

/************************************************
 ** TestController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export default class TestController {

	@GET('/test/:a/:b')
	static async abc({
		$query
	}) {
		return {
			"web-app": {
				"servlet": [
					{
						"servlet-name": "cofaxCDS",
						"servlet-class": "org.cofax.cds.CDSServlet",
						"init-param": {
							"configGlossary:installationAt": "Philadelphia, PA",
							"configGlossary:adminEmail": "ksm@pobox.com",
							"configGlossary:poweredBy": "Cofax",
							"configGlossary:poweredByIcon": "/images/cofax.gif",
							"configGlossary:staticPath": "/content/static",
							"templateProcessorClass": "org.cofax.WysiwygTemplate",
							"templateLoaderClass": "org.cofax.FilesTemplateLoader",
							"templatePath": "templates",
							"templateOverridePath": "",
							"defaultListTemplate": "listTemplate.htm",
							"defaultFileTemplate": "articleTemplate.htm",
							"useJSP": false,
							"jspListTemplate": "listTemplate.jsp",
							"jspFileTemplate": "articleTemplate.jsp",
							"cachePackageTagsTrack": 200,
							"cachePackageTagsStore": 200,
							"cachePackageTagsRefresh": 60,
							"cacheTemplatesTrack": 100,
							"cacheTemplatesStore": 50,
							"cacheTemplatesRefresh": 15,
							"cachePagesTrack": 200,
							"cachePagesStore": 100,
							"cachePagesRefresh": 10,
							"cachePagesDirtyRead": 10,
							"searchEngineListTemplate": "forSearchEnginesList.htm",
							"searchEngineFileTemplate": "forSearchEngines.htm",
							"searchEngineRobotsDb": "WEB-INF/robots.db",
							"useDataStore": true,
							"dataStoreClass": "org.cofax.SqlDataStore",
							"redirectionClass": "org.cofax.SqlRedirection",
							"dataStoreName": "cofax",
							"dataStoreDriver": "com.microsoft.jdbc.sqlserver.SQLServerDriver",
							"dataStoreUrl": "jdbc:microsoft:sqlserver://LOCALHOST:1433;DatabaseName=goon",
							"dataStoreUser": "sa",
							"dataStorePassword": "dataStoreTestQuery",
							"dataStoreTestQuery": "SET NOCOUNT ON;select test='test';",
							"dataStoreLogFile": "/usr/local/tomcat/logs/datastore.log",
							"dataStoreInitConns": 10,
							"dataStoreMaxConns": 100,
							"dataStoreConnUsageLimit": 100,
							"dataStoreLogLevel": "debug",
							"maxUrlLength": 500
						}
					},
					{
						"servlet-name": "cofaxEmail",
						"servlet-class": "org.cofax.cds.EmailServlet",
						"init-param": {
							"mailHost": "mail1",
							"mailHostOverride": "mail2"
						}
					},
					{
						"servlet-name": "cofaxAdmin",
						"servlet-class": "org.cofax.cds.AdminServlet"
					},

					{
						"servlet-name": "fileServlet",
						"servlet-class": "org.cofax.cds.FileServlet"
					},
					{
						"servlet-name": "cofaxTools",
						"servlet-class": "org.cofax.cms.CofaxToolsServlet",
						"init-param": {
							"templatePath": "toolstemplates/",
							"log": 1,
							"logLocation": "/usr/local/tomcat/logs/CofaxTools.log",
							"logMaxSize": "",
							"dataLog": 1,
							"dataLogLocation": "/usr/local/tomcat/logs/dataLog.log",
							"dataLogMaxSize": "",
							"removePageCache": "/content/admin/remove?cache=pages&id=",
							"removeTemplateCache": "/content/admin/remove?cache=templates&id=",
							"fileTransferFolder": "/usr/local/tomcat/webapps/content/fileTransferFolder",
							"lookInContext": 1,
							"adminGroupID": 4,
							"betaServer": true
						}
					}],
				"servlet-mapping": {
					"cofaxCDS": "/",
					"cofaxEmail": "/cofaxutil/aemail/*",
					"cofaxAdmin": "/admin/*",
					"fileServlet": "/static/*",
					"cofaxTools": "/tools/*"
				},

				"taglib": {
					"taglib-uri": "cofax.tld",
					"taglib-location": "/WEB-INF/tlds/cofax.tld"
				}
			}
		}
	}

	@POST('/test/:a/:b')
	@BODYPARSER()
	@MATCHER({
		query: {
			name: String,
			age: Number,
			city: String
		},
		params: {
			a: String,
			b: String
		},
		body: {
			markers: Array
		}
	})
	static async find1({
		query, params, body
	}) {
		return { query, params, body };
	}

	@GET('/test')
	@INJECT(authoriz(`${AppConfig.name}>test`, ['FIND']))
	static async find({
		query
	}) {
		let where = {};
		const rs: Test[] = await TestService.find({
			$where: where
		});
		return rs;
	}

	@GET('/test/:_id')
	@INJECT(authoriz(`${AppConfig.name}>test`, ['GET']))
	@MATCHER({
		params: {
			_id: Mongo.uuid
		}
	})
	static async get({
		params
	}) {
		const rs: Test = await TestService.get(params._id);
		return rs;
	}

	@POST('/test')
	@INJECT(authoriz(`${AppConfig.name}>test`, ['INSERT']))
	@BODYPARSER([{
		name: 'file',
		uploadDir: path.join(__dirname, "../../assets/images"),
		maxCount: 2,
		returnPath: "images/",
		resize: TestService.IMAGE_SIZES
	}])
	@MATCHER({
		body: {
			project_id: Mongo.uuid,
			name: String,
			age: Number,
			shared: Boolean,
			arr: Array,
			obj: Object,
			file: Array
		}
	})
	static async add({
		body
	}) {
		const rs: Test = await TestService.insert(body);
		return rs;
	}

	@PUT('/test/:_id')
	@INJECT(authoriz(`${AppConfig.name}>test`, ['UPDATE']))
	@BODYPARSER([{
		name: 'images',
		uploadDir: "assets/images",
		returnPath: "images/",
		resize: TestService.IMAGE_SIZES
	}])
	@MATCHER({
		params: {
			_id: Mongo.uuid
		},
		body: {
			project_id: Mongo.uuid,
			name: String,
			age: Number,
			shared: Boolean,
			arr: Array,
			obj: Object,
			file: Array
		}
	})
	static async edit({
		params,
		body
	}) {
		body._id = params._id;
		await TestService.update(body);
	}

	@DELETE('/test/:_id')
	@INJECT(authoriz(`${AppConfig.name}>test`, ['DELETE']))
	@MATCHER({
		params: {
			_id: Mongo.uuid
		}
	})
	static async del({
		params
	}) {
		await TestService.delete(params._id);
	}
}