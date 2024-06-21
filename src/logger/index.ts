import { BaseLogger, LoggerInputParams } from '../types'

export class ConsoleLogger implements BaseLogger {
  constructor() {}

  info(...params: LoggerInputParams) {
    console.log(...params)
  }

  error(...params: LoggerInputParams) {
    console.error(...params)
  }
}
