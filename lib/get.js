const fetch = require('node-fetch')
const { wait } = require('./promises')
const oneMinute = 60 * 1000

const { config } = require('../lib/config/get_config')()
// Register OAuth application to increase quotas
// https://developer.github.com/v3/#rate-limiting
// https://github.com/settings/personal-access-tokens
const { token } = config

const headers = {
  'User-Agent': 'backup-github-repo',
  'X-GitHub-Api-Version': '2026-03-10',
  'Accept': 'application/vnd.github+json',
  Authorization: `Bearer ${token}`
}

let lastRatelimitState

const get = module.exports = async (url, delay) => {
  try {
    if (delay) await wait(delay)
    const res = await fetch(url, { headers })
    const { status: statusCode, statusText } = res
    if (statusCode !== 200) {
      const body = await res.text()
      const message = `${statusCode} ${statusText} ${body}`
      throw new Error(message)
    } else {
      const { ratelimit } = parseHeaders(res.headers.raw())
      lastRatelimitState = ratelimit
      return await res.json()
    }
  } catch (err) {
    if (lastRatelimitState && lastRatelimitState.remaining < 5) {
      delay = lastRatelimitState.reset - Date.now() + 100
    } else {
      delay = delay || 1000
      delay = Math.min(delay * 2, 20 * oneMinute)
    }
    console.error(`[get request error: will retry in ${Math.round(delay / 1000)}s]`, err)
    if (lastRatelimitState) console.error('last known state of ratelimit', lastRatelimitState)
    return get(url, delay)
  }
}

const parseHeaders = headers => {
  const {
    'x-ratelimit-limit': limit,
    'x-ratelimit-remaining': remaining,
    'x-ratelimit-reset': reset,
    'x-ratelimit-used': used,
  } = headers
  return {
    ratelimit: {
      limit: parseInt(limit[0]),
      remaining: parseInt(remaining[0]),
      reset: parseInt(reset[0]) * 1000,
      used: parseInt(used[0]),
    }
  }
}
