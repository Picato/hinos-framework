import { GET, POST, PUT, DELETE, HEAD, INJECT } from 'hinos-route';
import { BODYPARSER } from 'hinos-bodyparser';
import { MATCHER } from 'hinos-requestmatcher';
import { Mongo } from 'hinos-mongo';
import { CheckInOutService } from '../service/CheckInOutService';
import { authoriz } from '../service/Authoriz';
import { Http } from 'hinos-common/Http';

/************************************************
 ** ChartController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export default class ChartController {

    @GET('/timesheet')
    static async find({ query }) {
        let where = {};
        const rs = await CheckInOutService.find();
        return rs;
    }

    @GET('/slack')
    static async postToSlack() {
        const startDate = new Date();
        const endDate = new Date();
        const rs = await CheckInOutService.find(startDate, endDate);
        const msg = {
            "text": `This is timesheet ${(<Date>startDate).toISOString().substring(0, 10)}`,
            "attachments": []
        }
        function compareTime(a, b){
            const a1 = a.split(':').map(e => +e);
            const b1 = b.split(':').map(e => +e);
            const toTime = (t) => {
                return (t[0] * 60 * 1000) + (t[1] * 1000) + t[1];
            }
            return toTime(a1) - toTime(b1);
        }
        for (let i in rs) {
            const u = rs[i];
            let timein = (<Date>u.time_in).toISOString().substring(11, 19);
            let timeout = (<Date>u.time_out).toISOString().substring(11, 19);
            const isBadIn = compareTime(timein, AppConfig.app.beginTime) >= 0;
            const isBadOut = compareTime(timeout, AppConfig.app.endTime) <= 0;
            const isEndDay = compareTime(new Date().toString().split(' ')[4], '17:31:00') >= 0;
            if(isBadIn) timein = `\`${timein}\``;
            if(isBadOut && isEndDay) timeout = `\`${timeout}\``;
            msg.attachments.push(
                {
                    title: `${+i + 1}. ${u.name}`,
                    color: (isBadIn || (isBadOut && isEndDay)) ? "danger" : "good",
                    fields: [
                        {
                            "title": "Time In",
                            "value": `${timein}`,
                            "short": true
                        },
                        {
                            "title": "Time Out",
                            "value": `${timeout}`,
                            "short": true
                        }
                    ],
                    mrkdwn_in: ["text", "fields"]
                }
            );
        }
        try {
            const http = await Http.post('https://hooks.slack.com/services/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', {
                type: 'json',
                data: msg
            });
        } catch (e) {
            console.log(e);
        }
        return msg;
    }

}