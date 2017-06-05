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
const hinos_route_1 = require("hinos-route");
const CheckInOutService_1 = require("../service/CheckInOutService");
const Http_1 = require("hinos-common/Http");
class ChartController {
    static async find({ query }) {
        let where = {};
        const rs = await CheckInOutService_1.CheckInOutService.find();
        return rs;
    }
    static async postToSlack() {
        const startDate = new Date();
        const endDate = new Date();
        const rs = await CheckInOutService_1.CheckInOutService.find(startDate, endDate);
        const msg = {
            "text": `This is timesheet ${startDate.toISOString().substring(0, 10)}`,
            "attachments": []
        };
        function compareTime(a, b) {
            const a1 = a.split(':').map(e => +e);
            const b1 = b.split(':').map(e => +e);
            const toTime = (t) => {
                return (t[0] * 60 * 1000) + (t[1] * 1000) + t[1];
            };
            return toTime(a1) - toTime(b1);
        }
        for (let i in rs) {
            const u = rs[i];
            let timein = u.time_in.toISOString().substring(11, 19);
            let timeout = u.time_out.toISOString().substring(11, 19);
            const isBadIn = compareTime(timein, AppConfig.app.beginTime) >= 0;
            const isBadOut = compareTime(timeout, AppConfig.app.endTime) <= 0;
            const isEndDay = compareTime(new Date().toString().split(' ')[4], '17:31:00') >= 0;
            if (isBadIn)
                timein = `\`${timein}\``;
            if (isBadOut && isEndDay)
                timeout = `\`${timeout}\``;
            msg.attachments.push({
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
            });
        }
        try {
            const http = await Http_1.Http.post('https://hooks.slack.com/services/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', {
                type: 'json',
                data: msg
            });
        }
        catch (e) {
            console.log(e);
        }
        return msg;
    }
}
__decorate([
    hinos_route_1.GET('/timesheet'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChartController, "find", null);
__decorate([
    hinos_route_1.GET('/slack'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChartController, "postToSlack", null);
exports.default = ChartController;
//# sourceMappingURL=CheckInOutController.js.map