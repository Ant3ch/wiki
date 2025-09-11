"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createError;
const Console_1 = require("./Console");
function createError(code, message) {
    Console_1.ConsoleLogger.error(message);
    return { code, message };
}
