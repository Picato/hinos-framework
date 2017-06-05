import * as sql from 'mssql';
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo';

export class SyncData {
    @MONGO()
    static mongo: Mongo;

    static dateToString(d: Date) {
        return `${d.getFullYear()}-${d.getMonth() < 9 ? '0' : ''}${d.getMonth() + 1}-${d.getDate() < 10 ? '0' : ''}${d.getDate()} 00:00:00.000`;
    }

    static async autoSyncSqlToMongo() {
        await SyncData.syncUser();
        await SyncData.syncCheckout();
    }

    private static async syncCheckout() {
        await sql.connect(AppConfig.mssql.url);
        try {
            const cout = [];
            const request = new sql.Request();
            let lastId: any = await SyncData.mongo.find('CheckOut', {
                $sort: {
                    Id: -1
                },
                $recordsPerPage: 1
            });
            lastId = lastId[0];
            const rs = await request.query(`select UserEnrollNumber, MIN(TimeStr) TimeIn, MAX(TimeStr) TimeOut, TimeDate, max(id) Id
            from CheckInOut ${lastId ? `where id > ${lastId.Id}` : ''}
            group by TimeDate, UserEnrollNumber
            order by Id desc`);
            for (let c of rs.recordset) {
                cout.push(c);
            }
            if (cout.length > 0) {
                const deleted = await SyncData.mongo.delete('CheckOut', {
                    $or: rs.recordset.map(e => { return { TimeDate: e.TimeDate, UserEnrollNumber: e.UserEnrollNumber } })
                }, { multiple: true });
                const inserted = await SyncData.mongo.insert('CheckOut', cout);
                console.log(`%s Sync checkout ${inserted.length} items`, new Date());
            }
            console.log(`%s Sync checkout 0 item`, new Date());
        } finally {
            await sql.close();
        }
    }
    private static async syncUser() {
        await sql.connect(AppConfig.mssql.url);
        try {
            const cout = [];
            const request = new sql.Request();
            const rsSql = await request.query(`select UserEnrollNumber, UserEnRollName from UserInfo`);
            const rsMongo = await SyncData.mongo.find('User', {
                $recordsPerPage: -1
            });
            if (rsMongo.length !== rsSql.recordset.length) {
                await SyncData.mongo.delete('User', undefined, { multiple: true });
                for (let c of rsSql.recordset) {
                    cout.push(c);
                }
                const inserted = await SyncData.mongo.insert('User', cout);
                console.log(`%s Sync user ${inserted.length} items`, new Date());
            }
            console.log(`%s Sync user 0 item`, new Date());
        } finally {
            await sql.close();
        }
    }

}