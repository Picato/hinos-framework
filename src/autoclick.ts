import * as robot from "robotjs";
import { SyncData } from './service/SyncDataStartup';

// Speed up the mouse.
robot.setMouseDelay(2);
robot.setKeyboardDelay(2);

const screenSize = robot.getScreenSize();
const width = screenSize.width;
const height = screenSize.height;

export async function scan(times: Array<number[]>) {
    setInterval(async () => {
        const d = new Date();
        if (times.find(e => e[0] === d.getHours() && e[1] === d.getMinutes()) && d.getSeconds() === 0) {
            console.log(`Scan at ${d.toUTCString()}`);
            await doNow();
        }
    }, 1000);
}

async function doNow() {
    // Open app
    robot.moveMouse(30, 30);
    robot.mouseClick('left', true);

    setTimeout(function () {
        // Click may cham chong
        robot.moveMouse(width / 2 - 280, height / 2 - 320);
        robot.mouseClick();
        setTimeout(function () {
            // Click tai du lieu cham cong
            robot.moveMouse(width / 2 - 410, height / 2 - 260);
            robot.mouseClick();

            setTimeout(function () {
                // Click duyet tu may cham cong
                robot.moveMouse(width / 2 - 100, height / 2 - 100);
                robot.mouseClick();

                setTimeout(async () => {
                    await SyncData.autoSyncSqlToMongo();
                    robot.moveMouse(width / 2 + 485, height / 2 - 355);
                    robot.mouseClick();
                }, 30000);
            }, 8000);
        }, 1500);
    }, 8000);
}