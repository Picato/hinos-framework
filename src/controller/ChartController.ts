import { GET, POST, PUT, DELETE, HEAD, INJECT } from 'hinos-route';
import { BODYPARSER } from 'hinos-bodyparser';
import { MATCHER } from 'hinos-requestmatcher';
import { Mongo } from 'hinos-mongo';
import { Chart, ChartService } from '../service/ChartService';
import { authoriz } from '../service/Authoriz'

/************************************************
 ** ChartController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export default class ChartController {

    @GET('/chart')
    @INJECT(authoriz(`${AppConfig.name}>chart`, ['FIND']))
    static async find({ query }) {
        let where = {};
        const rs: Chart[] = await ChartService.find({
            $where: where
        });
        return rs;
    }

    @GET('/chart/:_id')
    @INJECT(authoriz(`${AppConfig.name}>chart`, ['GET']))
    @MATCHER({
        params: {
            _id: Mongo.uuid
        }
    })
    static async get({ params }) {
        const rs: Chart = await ChartService.get(params._id);
        return rs;
    }

    @POST('/chart')
    @INJECT(authoriz(`${AppConfig.name}>chart`, ['INSERT']))
    @BODYPARSER()
    @MATCHER({
        body: {
            project_id: Mongo.uuid,
            account_id: Mongo.uuid,
            page_id: Mongo.uuid,
            oder: Number,
            options: Object
        }
    })
    static async add({ body }) {
        const rs: Chart = await ChartService.insert(body);
        return rs;
    }

    @PUT('/chart/:_id')
    @INJECT(authoriz(`${AppConfig.name}>chart`, ['UPDATE']))
    @BODYPARSER()
    @MATCHER({
        params: {
            _id: Mongo.uuid
        },
        body: {
            project_id: Mongo.uuid,
            account_id: Mongo.uuid,
            page_id: Mongo.uuid,
            oder: Number,
            options: Object
        }
    })
    static async edit({ params, body }) {
        body._id = params._id;
        await ChartService.update(body);
    }

    @DELETE('/chart/:_id')
    @INJECT(authoriz(`${AppConfig.name}>chart`, ['DELETE']))
    @MATCHER({
        params: {
            _id: Mongo.uuid
        }
    })
    static async del({ params }) {
        await ChartService.delete(params._id);
    }
}