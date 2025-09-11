"use strict";
// console.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLogger = void 0;
class ConsoleLogger {
    // Print an error message
    static error(...message) {
        console.error(`❌ ERROR-> ${message.join(' ')}`);
    }
    // Print a success message
    static success(...message) {
        console.log(`✅ SUCCESS: ${message.join(' ')}`);
    }
    // Optional: Info message
    static info(...messages) {
        console.info(`ℹ️ INFO: ${messages.join(' ')}`);
    }
}
exports.ConsoleLogger = ConsoleLogger;
