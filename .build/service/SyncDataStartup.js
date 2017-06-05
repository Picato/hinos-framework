"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const sql = require("mssql");
const hinos_mongo_1 = require("hinos-mongo");
class SyncData {
    static dateToString(d) {
        return `${d.getFullYear()}-${d.getMonth() < 9 ? '0' : ''}${d.getMonth() + 1}-${d.getDate() < 10 ? '0' : ''}${d.getDate()} 00:00:00.000`;
    }
    static async autoSyncSqlToMongo() {
        await SyncData.syncUser();
        await SyncData.syncCheckout();
    }
    static async syncCheckout() {
        await sql.connect(AppConfig.mssql.url);
        try {
            const cout = [];
            const request = new sql.Request();
            let lastId = await SyncData.mongo.find('CheckOut', {
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
                    $or: rs.recordset.map(e => { return { TimeDate: e.TimeDate, UserEnrollNumber: e.UserEnrollNumber }; })
                }, { multiple: true });
                const inserted = await SyncData.mongo.insert('CheckOut', cout);
                console.log(`%s Sync checkout ${inserted.length} items`, new Date());
            }
            console.log(`%s Sync checkout 0 item`, new Date());
        }
        finally {
            await sql.close();
        }
    }
    static async syncUser() {
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
        }
        finally {
            await sql.close();
        }
    }
}
__decorate([
    hinos_mongo_1.MONGO(),
    __metadata("design:type", Object)
], SyncData, "mongo", void 0);
exports.SyncData = SyncData;
//# sourceMappingURL=SyncDataStartup.js.map