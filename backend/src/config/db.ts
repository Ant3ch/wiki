import sqlite3 from 'sqlite3';
import { ConsoleLogger } from '../utils/Console';

class Database {
    private db : sqlite3.Database | null = null;
    private static instance : Database;
    private constructor() {}
    
    public static getInstance() : Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
    public getDb() : sqlite3.Database | null{
        return this.db;
    }
    // openeing database 
    public open() : sqlite3.Database {
        this.db = new sqlite3.Database(Database.getDatabaseFilePath(), (err) => {
            if (err) {
                ConsoleLogger.error('Error opening database:', err.message);
            } else {
                ConsoleLogger.success('Connected to the database.');
            }
        });
        return this.db;
    }

    // closing database
    public close() : void {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    ConsoleLogger.error('Error closing database:', err.message);
                }
                else {
                    ConsoleLogger.success('Database connection closed.');
                }
            });
            this.db = null;
        }
    }

    // check if database is open
    public isOpen() : boolean {
        return this.db !== null;
    }
    // check if database is closed
    public isClosed() : boolean {
        return this.db === null;
    }
    // get database instance
    public getInstanceDb() : sqlite3.Database | null {
        return this.db;
    }
    // get database file path
    public static getDatabaseFilePath() : string {
        return 'database.db';
    }
    // run a sql code 
    public run(sql: string, params: any[] = []): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database is not open'));
            } else {
                this.db.run(sql, params, function (err) {
                    if (err) {
                        ConsoleLogger.error('Error running SQL:', err.message);
                        reject(err);
                    }
                    else {
                        ConsoleLogger.success('SQL executed successfully:', sql);
                        resolve();
                    }
                })
            }
        })
}
}