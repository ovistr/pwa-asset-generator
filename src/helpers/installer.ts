import { Browser, install, InstalledBrowser } from '@puppeteer/browsers';
import ProgressBar from 'progress';
import preLogger from './logger';

let browserFetcher: InstalledBrowser;

// Override current environment proxy settings with npm configuration, if any.
const NPM_HTTPS_PROXY =
  process.env.npm_config_https_proxy || process.env.npm_config_proxy;
const NPM_HTTP_PROXY =
  process.env.npm_config_http_proxy || process.env.npm_config_proxy;
const NPM_NO_PROXY = process.env.npm_config_no_proxy;

if (NPM_HTTPS_PROXY) process.env.HTTPS_PROXY = NPM_HTTPS_PROXY;
if (NPM_HTTP_PROXY) process.env.HTTP_PROXY = NPM_HTTP_PROXY;
if (NPM_NO_PROXY) process.env.NO_PROXY = NPM_NO_PROXY;

const getBrowserFetcher = (): InstalledBrowser | undefined => {
  return browserFetcher;
};

const logger = preLogger('installer');

const toMegabytes = (bytes: number): string => {
  const mb = bytes / 1024 / 1024;
  return `${Math.round(mb * 10) / 10} Mb`;
};

let progressBar: ProgressBar;
let lastDownloadedBytes = 0;

const onProgress = (downloadedBytes: number, totalBytes: number): void => {
  if (!progressBar) {
    progressBar = new ProgressBar(
      `Downloading Chromium - ${toMegabytes(
        totalBytes,
      )} [:bar] :percent :etas `,
      {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: totalBytes,
      },
    );
  }
  const delta = downloadedBytes - lastDownloadedBytes;
  lastDownloadedBytes = downloadedBytes;
  progressBar.tick(delta);
};

const installPreferredBrowserRevision = async (): Promise<InstalledBrowser> => {
  logger.warn(
    `Chromium is not found in module folder, gonna have to download for you once`,
  );

  const installedRevision = await install({
    browser: Browser.CHROMEHEADLESSSHELL,
    unpack: true,
    buildId: 'chrome-stable',
    cacheDir: './.browser-cache',
    downloadProgressCallback: onProgress,
  });

  logger.log(
    `Chromium downloaded to ./.browser-cache/${installedRevision.buildId}`,
  );

  return installedRevision;
};

export default {
  getBrowserFetcher,
  installPreferredBrowserRevision,
};
