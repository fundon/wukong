var chalk = require('chalk');

/**
 * Log an error and then exit the process.
 *
 * @param {String} message
 */

exports.fatal = function (msg) {
  console.error();
  console.error(chalk.red('  Wukong') + chalk.gray(' · ') + msg);
  console.error();
  process.exit(1);
}

/**
 * Log a `message`.
 *
 * @param {String} message
 */

exports.log = function (message) {
  console.log();
  console.log(chalk.gray('  Wukong · ') + message);
  console.log();
}
