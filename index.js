const {
  https: { onRequest },
  scheduler: { onSchedule },
  logger,
} = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const next = require("next");
const { parse } = require("url");
const LRU = require("lru-cache");

initializeApp();

const nextConfig = require("./next.config");

const nextAppsLRU = new LRU({
  // TODO tune this
  max: 3,
  allowStale: true,
  updateAgeOnGet: true,
  dispose: (server) => {
    server.close();
  },
});

exports.web = onRequest(
  {
    concurrency: 300,
    region: "europe-west1",
    minInstances: 1,
    memory: "1GiB", // '512MB',
  },
  async (req, res) => {
    const { hostname, protocol, url } = req;
    const port = protocol === "https" ? 443 : 80;
    const key = [hostname, port].join(":");

    let nextApp = nextAppsLRU.get(key);
    if (!nextApp) {
      nextApp = next({
        ...nextConfig,
        dir: process.cwd(),
        hostname,
        port: process.env.NODE_ENV === "development" ? 5001 : port,
      });
      nextAppsLRU.set(key, nextApp);
    }

    await nextApp.prepare();
    const parsedUrl = parse(url, true);

    logger.info(`[web] ${parsedUrl.pathname}`);
    await nextApp.getRequestHandler()(req, res, parsedUrl);
  }
);
