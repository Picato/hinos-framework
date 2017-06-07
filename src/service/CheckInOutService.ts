import * as _ from 'lodash';
import { VALIDATE, Checker } from 'hinos-validation';
import { ImageResize } from 'hinos-bodyparser';
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo';
import HttpError from '../common/HttpError';
import * as sql from 'mssql';

/************************************************
 ** ChartService || 4/10/2017, 10:19:24 AM **
 ************************************************/

function dateToString(d: Date) {
    return `${d.getFullYear()}-${d.getMonth() < 9 ? '0' : ''}${d.getMonth() + 1}-${d.getDate() < 10 ? '0' : ''}${d.getDate()} 00:00:00.000`;
}

export class CheckInOutService {

    @MONGO()
    static mongo: Mongo;

    static async findUser() {
        return await CheckInOutService.mongo.find('User', {
            $recordsPerPage: -1
        });
    }

    static async find(startDate = new Date(), endDate = new Date()): Promise<Array<any>> {
        startDate.setHours(0);
        startDate.setMinutes(0);
        startDate.setSeconds(0);
        startDate.setMilliseconds(0);
        endDate.setHours(0);
        endDate.setMinutes(0);
        endDate.setSeconds(0);
        endDate.setMilliseconds(0);
        endDate.setDate(endDate.getDate() + 1);
        const rs = await CheckInOutService.mongo.find('CheckOut', {
            $where: {
                TimeDate: {
                    $gte: startDate,
                    $lt: endDate
                }
            },
            $recordsPerPage: -1,
            $sort: {
                TimeOut: -1
            }
        });
        const users = await CheckInOutService.findUser();
        return rs.map((e: any) => {
            const user: any = users.find((e0: any) => e.UserEnrollNumber === e0.UserEnrollNumber);
            if (user) e.UserEnRollName = user.UserEnRollName;
            return e;
        });
    }
}