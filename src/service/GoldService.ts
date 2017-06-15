import * as _ from 'lodash';
import { VALIDATE, Checker } from 'hinos-validation';
import { ImageResize } from 'hinos-bodyparser';
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo';
import HttpError from '../common/HttpError';
import * as xml2js from 'xml2js';
import { Http } from 'hinos-common/Http';

/************************************************
 ** ChartService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('gold')
export class Gold {
    _id?: Uuid;
    buy?: number;
    sell?: number;
    type?: string;
    date?: Date;
    created_at?: Date;
    updated_at?: Date;
}

export class GoldService {
    @MONGO()
    static mongo: Mongo;

    static oldSell: number = 0;
    static oldBuy: number = 0;

    static autoSync() {
        console.log('Auto sync gold price');
        setInterval(() => {
            GoldService.sync();
        }, 1000 * 60 * 15);
    }

    static parseDate(strDate: string): Date {
        const strs = strDate.split(' ');
        const dmy = strs[2].split('/').map((e: any, i) => {
            if (i === 1) e = +e - 1;
            return +e;
        }).reverse();
        const hms = strs[0].split(':').map((e: any, i) => {
            if (strs[1] === 'PM' && i === 0) {
                e = +e + 12;
            }
            return +e;
        });
        return new Date(dmy[0], dmy[1], dmy[2], hms[0], hms[1], hms[2]);
    }

    static async sync() {
        if (!GoldService.oldSell || !GoldService.oldBuy) {
            const rs = await GoldService.mongo.find<Gold>(Gold, {
                $sort: {
                    updated_at: -1
                },
                $recordsPerPage: 1
            });
            if (rs && rs.length > 0) {
                GoldService.oldSell = rs[0].sell;
                GoldService.oldBuy = rs[0].buy;
            }
        }
        const rs = await Http.get('http://www.sjc.com.vn/xml/tygiavang.xml?t=' + new Date().getTime());
        var parseString = xml2js.parseString;
        return new Promise(async (resolve, reject) => {
            parseString(rs.body, async (err, result) => {
                if (err) return reject(err);
                const hn = result.root.ratelist[0].city.find(e => e.$.name === 'Hà Nội');
                const hnDetail: any = hn.item.find(e => e.$.type === 'Vàng SJC').$;
                hnDetail.date = GoldService.parseDate(result.root.ratelist[0].$.updated);
                hnDetail.sell = +hnDetail.sell;
                hnDetail.buy = +hnDetail.buy;
                if (hnDetail.sell !== GoldService.oldSell || hnDetail.buy !== GoldService.oldBuy) {
                    // Notify when gold price decrease
                    const http = await Http.post('https://hooks.slack.com/services/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', {
                        type: 'json',
                        data: {
                            "attachments": [
                                {
                                    "title": `${result.root.ratelist[0].$.updated}`,
                                    "color": `${hnDetail.sell < GoldService.oldSell ? 'danger' : 'good'}`,
                                    "fields": [
                                        {
                                            "title": `Giá mua từ NH >>> ${Math.abs(hnDetail.sell - GoldService.oldSell)} tr`,
                                            "value": `\`${hnDetail.sell > GoldService.oldSell ? '+' : ''}${hnDetail.sell - GoldService.oldSell}\``,
                                            "short": true,
                                        },
                                        {
                                            "title": `Giá bán cho NH >>> ${Math.abs(hnDetail.buy - GoldService.oldBuy)} tr`,
                                            "value": `\`${hnDetail.buy > GoldService.oldBuy ? '+' : ''}${hnDetail.buy - GoldService.oldBuy}\``,
                                            "short": true,
                                        }
                                    ],
                                    mrkdwn_in: ["fields"]
                                }
                            ]
                        }
                    });
                    GoldService.oldSell = hnDetail.sell;
                    GoldService.insert(hnDetail);
                }
                resolve(hnDetail);
            });
        });
    }

    @VALIDATE((body: Gold) => {
        body._id = <Uuid>Mongo.uuid();
        Checker.must('buy', body.buy, Number);
        Checker.must('sell', body.sell, Number);
        Checker.must('type', body.type, String);
        Checker.must('date', body.date, Date);
        body.created_at = new Date();
        body.updated_at = new Date();
    })
    static async insert(body: Gold, validate?: Function): Promise<Gold> {
        const rs: Gold = await GoldService.mongo.insert<Gold>(Gold, body);
        return rs;
    }

}