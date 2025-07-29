import {
    Logger,
    createLogger,
    format,
    transports,
    LoggerOptions,
} from "winston";
import { AppUtils } from "./app.utils";
const { printf } = format;
const { Console } = transports;
const path = require("path");

export interface LogOptions {
    message: string;
    event?: string;
    username?: string;
    payload?: any;
    stack?: any;
    reqId?: string;
    traceId?: string;
    url?: string;
}

class AppLogger {
    winstonLogger: Logger;

    constructor() {
        const transports: any[] = [];
        transports.push(new Console());

        const myFormat = printf(
            ({
                timestamp,
                level,
                message,
                payload,
                stack,
                event,
                username,
                merchant,
                udid,
                tid,
                reqId,
                traceId,
                line,
                url,
            }) => {
                return JSON.stringify({
                    level,
                    timestamp,
                    username,
                    merchant,
                    udid,
                    tid,
                    event,
                    message,
                    reqId,
                    traceId,
                    payload,
                    stack,
                    line,
                    url,
                });
            },
        );

        const loggerOptions: LoggerOptions = {
            transports: transports,
            format: myFormat,
            level: process.env.LOG_LEVEL || "info",
        };
        this.winstonLogger = createLogger(loggerOptions);
    }

    /**
     * Attempts to add file and line number info to the given log arguments.
     * @param {*} args
     */

    formatLogArguments(options: LogOptions): any {
        const formatted: any = {
            timestamp: AppUtils.now().format("YYYY-MM-DD HH:mm:ss:SSS"),
            username: options.username,
            // udid: options.terminal?.udid,
            // tid: options.terminal?.id,
            // mid: options.terminal?.merchantId,
            // bankTid: options.paymentSettings?.bankTid,
            ...options,
        };
        const stackInfo = this.getStackInfo(1);

        if (stackInfo) {
            // get file path relative to project root
            // const calleeStr = '(' + stackInfo.relativePath + ':' + stackInfo.line + ')';
            const calleeStr = `${stackInfo.relativePath}:${stackInfo.method}:${stackInfo.line}`;
            // const calleeStrHl = highlight(calleeStr);
            // console.log(calleeStrHl);
            // console.log(options.terminalUser?.terminal);
            formatted.line = calleeStr;
        }
        return formatted;
    }

    /**
     * Parses and returns info about the call stack at the given index.
     */

    getStackInfo(stackIndex) {
        // get call stack, and analyze it
        // get all file, method, and line numbers
        const stacklist = new Error().stack!.split("\n").slice(3);

        // stack trace format:
        // http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
        // do not remove the regex expresses to outside of this method (due to a BUG in node.js)
        const stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/gi;
        const stackReg2 = /at\s+()(.*):(\d*):(\d*)/gi;

        const s = stacklist[stackIndex] || stacklist[0];
        const sp = stackReg.exec(s) || stackReg2.exec(s);

        if (sp && sp.length >= 5) {
            return {
                method: sp[1],
                relativePath: path.relative(global.__basedir, sp[2]),
                line: sp[3],
                pos: sp[4],
                file: path.basename(sp[2]),
                stack: stacklist.join("\n"),
            };
        }
    }

    error(options: LogOptions) {
        this.winstonLogger.error(this.formatLogArguments(options));
    }
    warn(options: LogOptions) {
        this.winstonLogger.warn(this.formatLogArguments(options));
    }
    info(options: LogOptions) {
        this.winstonLogger.info(this.formatLogArguments(options));
    }
    verbose(options: LogOptions) {
        this.winstonLogger.verbose(this.formatLogArguments(options));
    }
    debug(options: LogOptions) {
        this.winstonLogger.debug(this.formatLogArguments(options));
    }
}

const logger = new AppLogger();
export { logger };