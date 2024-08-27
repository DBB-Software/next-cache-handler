export type LoggerInputParams = Parameters<typeof console.log>

export interface BaseLogger {
  info(...params: LoggerInputParams): void
  error(...params: LoggerInputParams): void
}

export class ConsoleLogger implements BaseLogger {
  constructor() {}

  info(...params: LoggerInputParams) {
    console.log(...params)
  }

  error(...params: LoggerInputParams) {
    console.error(...params)
  }
}
