#!/usr/bin/env node

const _progress = require('cli-progress');
const { format:formatDate, addSeconds } = require('date-fns');
const fs = require('fs').promises;
const path = require('path');
const {init} = require('./utils');
const _colors = require('colors');


function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

// create new container
const multibar = new _progress.MultiBar({
    format: `  ${_colors.grey('{bar}')} │ {time} │ {state} │ {display} {message}` ,
    forceRedraw: true,
    hideCursor: true,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    clearOnComplete: false,
    stopOnComplete: true,
    synchronousUpdate: true
});


function exitHandler(options, exitCode) {
    multibar.stop();
    if (options.exit) process.exit(exitCode);
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));


function mktime(start, end, fail) {
    if (!start) return "00:00";
    if (start && end) {
        let seconds = parseInt(end) - parseInt(start);
        var helperDate = addSeconds(new Date(0), seconds);
        return `${formatDate(helperDate, 'mm:ss')}`;
    }

    if (start && fail) {
        let seconds = parseInt(fail) - parseInt(start);
        var helperDate = addSeconds(new Date(0), seconds);
        return `${formatDate(helperDate, 'mm:ss')}`;
    }

    end =  new String(Date.now() / 1000);
    let seconds = parseInt(end) - parseInt(start);
    var helperDate = addSeconds(new Date(0), seconds);
    let time = formatDate(helperDate, 'mm:ss');
    return `${time}`;
}

function mkpercent(start, end, fail, eta) {
    if (!start) return 0;
    if (end) return 100;
    if (!eta) return 0;

    let last = new String(Date.now() / 1000);
    if (fail) {
        last = parseInt(fail);
    }

    let seconds = parseInt(last) - parseInt(start);
    eta = parseInt(eta);

    let max_percent = 98;
    if (seconds > eta) {
        return max_percent;
    }

    let percent = (seconds/eta * 100) | 0;
    percent = Math.max(1,percent); //never put 0% completion
    return Math.min(percent,max_percent); //never put 100% completion
}


function mkmsg(msg) {
    if (!msg) return "";
    return `${msg}`;
}

function mkdisplay(name) {
    return `${name}`;
}

function mkstate(state) {
    let len = state.length;
    let fill = 9;
    let start = ((fill - len)/2) | 0;
    let end = fill - len - start;
    return "".padEnd(start, ' ') + `${state}` + "".padEnd(end, " ");
}

function centerPad(text, fill, char) {
    let len = text.length;
    let start = ((fill - len)/2) | 0;
    let end = fill - len - start;
    return "".padEnd(start, char) + `${text}` + "".padEnd(end, char);
}

function parseLine(txt) {
    if (!txt) return [];

    let parts = txt.split("|");
    return [
        (parts[0] || "").replace(/^\s+|\s+$/g, ''),
        (parts[1] || "").replace(/^\s+|\s+$/g, ''),
        (parts[2] || "").replace(/^\s+|\s+$/g, ''),
    ];
}

async function get_task_info(task_id, strict = false) {

    const TASKS_DIR = await init();

    try {
        let file_path = path.join(TASKS_DIR,task_id);
        try {
            await fs.access(file_path);
        } catch (ex) {
            if (strict) return null;
            return {
                name: task_id,
                start: "0",
                eta: "60",
                percent: "0",
                display: mkdisplay(task_id),
                state: mkstate('unknown'),
                time: mktime(""),
                message: mkmsg("")
            };
        }
        let text = (await fs.readFile(file_path)).toString();
        text = text.replace(/^\s+|\s+$/g, '');
        let lines = text.split("\n");

        let [task_first_state, task_first_time, eta] = parseLine(lines[0]);
        let [task_last_state, task_last_time] = parseLine(lines[lines.length-1]);

        let completion_time = "";
        if (task_last_state.startsWith("-")) {
            task_last_state = task_last_state.substring(1);
            completion_time = task_last_time;
        }

        let failure_time = "";
        if (task_last_state.startsWith("!")) {
            task_last_state = task_last_state.substring(1);
            failure_time = task_last_time;
        }

        let task_info = {
            start: task_first_time,
            eta: eta,
            percent: mkpercent(task_first_time, completion_time, failure_time, eta),
            end: completion_time,
            name: task_first_state,
            display: mkdisplay(task_first_state || task_id),
            state: mkstate(task_last_state),
            time: mktime(task_first_time, completion_time, failure_time),
            message: mkmsg("")
        };

        return task_info;
    } catch (ex) {
        return {
            name: task_id,
            start: "0",
            eta: "60",
            percent: "0",
            display: mkdisplay(task_id),
            state: mkstate('error'),
            time: mktime(""),
            message: mkmsg(ex.message)
        };
    }
}

async function monitor(task_list) {
    const TASKS_DIR = await init();

    let fill = 80;
    let message = _colors.bold("- Lab Startup Tasks -");
    console.log("\n" + centerPad(message, fill,  ' ') + "\n");

    console.log(
        " " + centerPad(_colors.underline("Progress"), 50, ' ') +
        "   " + _colors.underline("Time") + "  "  +
        "    " + _colors.underline("State") +
        "    " + _colors.underline("Task"));
    console.log("");





    async function get_task_ids(){
        if (!task_list) return await fs.readdir(TASKS_DIR);
        return task_list.split(",");
    }

    let tasks = {};

    while(true) {
        let files = await get_task_ids();
        for (let file of files) {
            let task_id = file;
            if (tasks[task_id]) continue;

            tasks[task_id] = {};
            tasks[task_id].id = task_id;
            tasks[task_id].info = await get_task_info(task_id);
        }

        let task_array = Object.values(tasks);
        task_array.sort(function(a,b) {
            return parseInt(a.info.start) - parseInt(b.info.start);
        })

        for(let task of task_array) {
            task.info = await get_task_info(task.id, !task_list);
            if (!task.info && task.bar) {
                multibar.remove(task.bar);
                continue;
            }

            if (!task.bar) {
                task.bar = multibar.create(100, 0, );
            }

            let bar = task.bar;
            bar.update(task.info.percent, task.info);
        }
        await sleep(3);
    }

}


module.exports = monitor;