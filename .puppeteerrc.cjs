const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  defaultBrowser: 'chrome',
  browsers: ['chrome'],
  chrome: {
    skipDownload: false
  }
};
