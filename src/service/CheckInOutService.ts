import * as _ from 'lodash';
import { VALIDATE, Checker } from 'hinos-validation';
import { ImageResize } from 'hinos-bodyparser';
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo';
import HttpError from '../common/HttpError';
import * as sql from 'mssql';

/************************************************
 ** ChartService || 4/10/2017, 10:19:24 AM **
 ************************************************/

function dateToString(d: Date){
    return `${d.getFullYear()}-${d.getMonth() < 9 ? '0' : ''}${d.getMonth()+1}-${d.getDate() < 10 ? '0' : ''}${d.getDate()} 00:00:00.000`;
}

export class CheckInOutService {

    static async find(startDate = new Date(), endDate = new Date()): Promise<Array<any>> {
        await sql.connect(AppConfig.mssql.url);
        try {
            const request = new sql.Request();
            request.input('start', startDate);
            request.input('end', endDate);
            const rs = await request.query(`select ROW_NUMBER() OVER (ORDER BY TimeDate) AS RowNum
				,b.UserFullCode code
				,b.UserEnrollName name
				,a.TimeDate date
				,a.TimeIn time_in
				,a.TimeOut time_out
				,DATEDIFF(minute, a.TimeIn, a.TimeOut) TimeWork
				from UserInfo b inner join (      
				select UserEnrollNumber, MIN(TimeStr) TimeIn, MAX(TimeStr) TimeOut, TimeDate, OriginType
				from CheckInOut
				group by TimeDate, UserEnrollNumber, OriginType
			) a on a.UserEnrollNumber = b.UserEnrollNumber
			where a.TimeDate >= '${dateToString(startDate)}' and a.TimeDate <= '${dateToString(endDate)}'
			order by b.UserFullCode`);
            return rs.recordset;
        } finally {
            await sql.close();
        }
    }
}