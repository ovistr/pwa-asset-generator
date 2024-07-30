import {
  Browser,
  BrowserPlatform,
  detectBrowserPlatform,
  getInstalledBrowsers,
  install,
  InstalledBrowser,
  resolveBuildId,
  uninstall,
} from '@puppeteer/browsers';
import path from 'path';
import ProgressBar from 'progress';
import constants from '../config/constants';
import preLogger from './logger';

const BROWSER_CACHE_DIR = path.resolve(
  __dirname,
  `../../${constants.BROWSER_CACHE_DIR}`,
);

// Override current environment proxy settings with npm configuration, if any.
const NPM_HTTPS_PROXY =
  process.env.npm_config_https_proxy || process.env.npm_config_proxy;
const NPM_HTTP_PROXY =
  process.env.npm_config_http_proxy || process.env.npm_config_proxy;
const NPM_NO_PROXY = process.env.npm_config_no_proxy;

if (NPM_HTTPS_PROXY) process.env.HTTPS_PROXY = NPM_HTTPS_PROXY;
if (NPM_HTTP_PROXY) process.env.HTTP_PROXY = NPM_HTTP_PROXY;
if (NPM_NO_PROXY) process.env.NO_PROXY = NPM_NO_PROXY;

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

const resolvePrefferedBrowserBuildId = (): Promise<string> => {
  // TODO: What platform should we use as a fallback? resolveBuildId() requires it to be defined...
  const platform = detectBrowserPlatform() ?? BrowserPlatform.LINUX;
  return resolveBuildId(Browser.CHROMEHEADLESSSHELL, platform, 'stable');
};

const cleanupUnusedBrowsers = async (
  browsers: InstalledBrowser[],
): Promise<void> => {
  const prefferedBrowserVersion = await resolvePrefferedBrowserBuildId();

  browsers.forEach(async (browser) => {
    if (browser.buildId === prefferedBrowserVersion) {
      return;
    }

    await uninstall({
      browser: Browser.CHROMEHEADLESSSHELL,
      buildId: browser.buildId,
      cacheDir: BROWSER_CACHE_DIR,
    });
  });
};

let localBrowser: InstalledBrowser | undefined;

const getLocalBrowser = async (): Promise<InstalledBrowser | undefined> => {
  if (localBrowser) {
    return localBrowser;
  }

  const cachedBrowsers = await getInstalledBrowsers({
    cacheDir: BROWSER_CACHE_DIR,
  });

  if (cachedBrowsers.length === 0) {
    return undefined;
  }

  [localBrowser] = cachedBrowsers;

  // Cleanup unused browsers if there are any
  await cleanupUnusedBrowsers(cachedBrowsers);

  return localBrowser;
};

const installLocalBrowser = async (): Promise<InstalledBrowser> => {
  logger.warn(
    `Chromium is not found in module folder, gonna have to download for you once`,
  );

  const buildId = await resolvePrefferedBrowserBuildId();

  const installedBrowser = await install({
    unpack: true,
    browser: Browser.CHROMEHEADLESSSHELL,
    buildId,
    cacheDir: BROWSER_CACHE_DIR,
    downloadProgressCallback: onProgress,
  });

  logger.log(
    `Chromium downloaded to ${BROWSER_CACHE_DIR}/${installedBrowser.buildId}`,
  );

  return installedBrowser;
};

export default {
  getLocalBrowser,
  installLocalBrowser,
};
