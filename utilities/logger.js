const { utilFormat, getCurrentTimestamp} = require("./utility");
const fs = require("fs");
class Logger {
  constructor() {
    this.consoleColor = {
      front: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m"
      },
      back: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m"
      },
      reset: "\x1b[0m"
    };
    this.logFilePath = `${this.getLogsFolderPath()}${this.getFileName()}`;

    console.log(this.logFilePath)
    if (!fs.existsSync(this.getLogsFolderPath())) {
      fs.mkdirSync(this.getLogsFolderPath());
    }
    //fs.writeFileSync(this.logFilePath, "START LOG");
  }

  /** Returns the Filename for Logs
   * @returns string - Logs file name
   */
  getFileName() {
    return `${getCurrentTimestamp()}.txt`;
  } 

  /** Returns the path to the Logs folder with / at the end
   * @param {boolean} useRelative
   * @returns
   */
  getLogsFolderPath() {
    return process.cwd() + "/serverLogs/";
  }

  /**
   * @param {string} type ("front", "back")
   * @param {string} color ("black", "red", "green", "yellow", "blue", "magenta", "cyan", "white")
   * @returns 
   */
  getConsoleColor(type = "front", color = "white") {
    const colorTag = this.consoleColor[type][color];
    if (!colorTag)
      return "";
    return colorTag;
  }

  console(data) {
    // allow to change this shit in 1 place and everywhere it will be changed
    console.log(data);
  }

  /** Write log in console and into the file
   * @param {string} type ("LogData", "[Error]") - will be written first in log
   * @param {any} data - object or string that will be written in logs
   * @param {string} colorAtFront ("black", "red", "green", "yellow", "blue", "magenta", "cyan", "white")
   * @param {string} colorAtBack ("black", "red", "green", "yellow", "blue", "magenta", "cyan", "white")
   */
  log(type, data, colorAtFront, colorAtBack) {
    const frontColor = this.getConsoleColor("front", colorAtFront);
    const backColor = this.getConsoleColor("back", colorAtBack);
    const time = LoggerUtils.getIsoDateString(true);

    const logString = `${frontColor}${backColor}${type}${this.consoleColor.reset} ${time} `;
    const fileString = `${type}${time}`;
    const logFileStream = fs.createWriteStream(this.logFilePath, {flags: 'a+'});
    if (typeof data == "string") {
      this.console(logString + data);
      logFileStream.once('open', function(fd) {
        logFileStream.write(utilFormat(`${fileString} - ${data}\n`));
        logFileStream.end();
      });
    } else {
      this.console(logString);
      this.console(data);
      logFileStream.once('open', function(fd) {
        logFileStream.write(utilFormat(fileString));
        logFileStream.write(" - ");
        logFileStream.write(utilFormat(data));
        logFileStream.write(utilFormat("\n"));
        logFileStream.end();
      });
    }
  }

  info(text) {
    this.log("[INFO]", text, "white", "blue");
  }

  success(text) {
    this.log("[SUCCESS]", text, "white", "green");
  }

  warn(text) {
    this.log("[WARNING]", text, "white", "yellow");
  }

  error(text) {
    this.log("[ERROR]", text, "white", "red");
  }

  /**
   * @param {*} text
   * @param {number} mode 0 -> only draw log, 1 -> draw log and start timer, 2 -> end timer (default: 0)
   * @returns
   */
  debug(text, mode = 0) {
    switch (mode) {
      case 0:
        this.log("[DEBUG]", text, "white");
        return;
      case 1:
        this.log("[DEBUG]", text, "white");
        console.time(text);
        return;
      case 2:
        console.timeEnd(text);
        return;
    }
  }

  request(text) {
    this.log("[REQUEST]", text, "cyan", "black");
  }

  throwError(message, whereOccured, additionalInfo = "") {
    throw new Error(message + "\r\n" + whereOccured + (additionalInfo != "" ? `\r\n${additionalInfo}` : ""));
  }
}

class LoggerUtils {

  static getIsoDateString(){
    return new Date().toISOString().
      replace(/T/, ' ').
      replace(/\..+/, '');
  }

}

module.exports = new Logger();
