"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3_1 = __importDefault(require("sqlite3"));
const Console_1 = require("../utils/Console");
class Database {
    constructor() {
        this.db = null;
    }
    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
    getDb() {
        return this.db;
    }
    // openeing database 
    open() {
        this.db = new sqlite3_1.default.Database(Database.getDatabaseFilePath(), (err) => {
            if (err) {
                Console_1.ConsoleLogger.error('Error opening database:', err.message);
            }
            else {
                Console_1.ConsoleLogger.success('Connected to the database.');
            }
        });
        return this.db;
    }
    // closing database
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    Console_1.ConsoleLogger.error('Error closing database:', err.message);
                }
                else {
                    Console_1.ConsoleLogger.success('Database connection closed.');
                }
            });
            this.db = null;
        }
    }
    // check if database is open
    isOpen() {
        return this.db !== null;
    }
    // check if database is closed
    isClosed() {
        return this.db === null;
    }
    // get database instance
    getInstanceDb() {
        return this.db;
    }
    // get database file path
    static getDatabaseFilePath() {
        return 'database.db';
    }
    // run a sql code 
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database is not open'));
            }
            else {
                this.db.run(sql, params, function (err) {
                    if (err) {
                        Console_1.ConsoleLogger.error('Error running SQL:', err.message);
                        reject(err);
                    }
                    else {
                        Console_1.ConsoleLogger.success('SQL executed successfully:', sql);
                        resolve();
                    }
                });
            }
        });
    }
}
