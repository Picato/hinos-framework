import * as _ from 'lodash';
import { VALIDATE, Checker } from 'hinos-validation';
import { ImageResize } from 'hinos-bodyparser';
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo';
import HttpError from '../common/HttpError';

/************************************************
 ** ChartService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('chart')
export class Chart {
    _id?: Uuid;
    project_id?: Uuid;
    account_id?: Uuid;
    page_id?: Uuid;
    oder?: number;
    options?: object;
    created_at?: Date;
    updated_at?: Date;
}

export class ChartService {
    @MONGO()
    static mongo: Mongo;

    static async find(fil: any = {}): Promise<Array<Chart>> {
        const rs: Chart[] = await ChartService.mongo.find<Chart>(Chart, fil);
        return rs;
    }

    static async get(_id: any): Promise<Chart> {
        const rs: Chart = await ChartService.mongo.get<Chart>(Chart, _id);
        return rs;
    }

    @VALIDATE((body: Chart) => {
        body._id = <Uuid>Mongo.uuid();
        Checker.must('project_id', body.project_id, Uuid);
        Checker.must('account_id', body.account_id, Uuid);
        Checker.must('page_id', body.page_id, Uuid);
        Checker.must('oder', body.oder, Number, 1);
        Checker.must('options', body.options, Object);
        body.created_at = new Date();
        body.updated_at = new Date();
    })
    static async insert(body: Chart, validate?: Function): Promise<Chart> {
        const rs: Chart = await ChartService.mongo.insert<Chart>(Chart, body);
        return rs;
    }

    @VALIDATE((body: Chart) => {
        Checker.must('_id', body._id, Uuid);
        Checker.option('project_id', body.project_id, Uuid);
        Checker.option('account_id', body.account_id, Uuid);
        Checker.option('page_id', body.page_id, Uuid);
        Checker.option('oder', body.oder, Number);
        Checker.option('options', body.options, Object);
        Checker.option('created_at', body.created_at, Date);
        body.updated_at = new Date();
    })
    static async update(body: Chart, validate?: Function) {
        const rs: number = <number>await ChartService.mongo.update<Chart>(Chart, body);
        if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update');
    }

    @VALIDATE((_id: Uuid) => {
        Checker.must('_id', _id, Uuid);
    })
    static async delete(_id: Uuid) {
        const rs: number = <number>await ChartService.mongo.delete<Chart>(Chart, _id);
        if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete');
    }

}