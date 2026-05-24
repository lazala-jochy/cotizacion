const fs = require('fs');
const path = require('path');

function loadUpdateToken() {
  const tokenPath = path.join(__dirname, 'update-token.json');
  try {
    if (fs.existsSync(tokenPath)) {
      const data = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
      if (data?.token) return data.token;
    }
  } catch {
    /* ignore */
  }
  return process.env.COTIZACION_GH_UPDATE_TOKEN || null;
}

function getPublishConfig() {
  try {
    const pkg = require(path.join(__dirname, '..', 'package.json'));
    return pkg.build?.publish || {};
  } catch {
    return {};
  }
}

function configureGithubUpdater(autoUpdater) {
  const publish = getPublishConfig();
  const token = loadUpdateToken();
  const isPrivate = publish.private === true;

  if (isPrivate && !token) {
    console.warn(
      '[updater] Repo privado sin token embebido. Recompila con: export GH_TOKEN=... && npm run dist:publish'
    );
    return { ok: false, isPrivate, hasToken: false };
  }

  if (publish.provider === 'github' && publish.owner && publish.repo) {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: publish.owner,
      repo: publish.repo,
      private: isPrivate,
      ...(token ? { token } : {}),
    });
  }

  if (token) {
    autoUpdater.requestHeaders = {
      Authorization: `token ${token}`,
    };
  }

  return { ok: true, isPrivate, hasToken: Boolean(token) };
}

module.exports = { loadUpdateToken, configureGithubUpdater, getPublishConfig };
