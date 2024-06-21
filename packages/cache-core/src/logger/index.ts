import { BaseLogger, LoggerInputParams } from '@dbbs/next-cache-handler-common'

export class ConsoleLogger implements BaseLogger {
  constructor() {}

  info(...params: LoggerInputParams) {
    console.log(...params)
  }

  error(...params: LoggerInputParams) {
    console.error(...params)
  }
}
