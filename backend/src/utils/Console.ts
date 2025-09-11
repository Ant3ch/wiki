// console.ts

export class ConsoleLogger {
  // Print an error message
  static error(...message: string[]): void {
    console.error(`❌ ERROR-> ${message.join(' ')}`);
  }

  // Print a success message
  static success(...message: string[]): void {
    console.log(`✅ SUCCESS: ${message.join(' ')}`);
  }

  // Optional: Info message
  static info(...messages: string[]): void {
    console.info(`ℹ️ INFO: ${messages.join(' ')}`);
  }
}
