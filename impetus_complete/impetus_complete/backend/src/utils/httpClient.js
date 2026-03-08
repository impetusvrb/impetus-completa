/**
 * CLIENTE HTTP COM TIMEOUT E RETRY
 * Para chamadas a serviços externos (Z-API, etc)
 */

const axios = require('axios');
const axiosRetry = require('axios-retry').default;

const DEFAULT_TIMEOUT = parseInt(process.env.HTTP_TIMEOUT_MS) || 15000; // 15s
const DEFAULT_RETRIES = parseInt(process.env.HTTP_RETRIES) || 3;

/**
 * Cria instância axios com retry e timeout
 */
function createResilientClient(baseConfig = {}) {
  const client = axios.create({
    timeout: DEFAULT_TIMEOUT,
    ...baseConfig
  });

  axiosRetry(client, {
    retries: DEFAULT_RETRIES,
    retryCondition: (error) => {
      return (
        axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        (error.response && error.response.status >= 500)
      );
    },
    retryDelay: (retryCount) => {
      return Math.min(1000 * Math.pow(2, retryCount), 10000);
    },
    shouldResetTimeout: true
  });

  return client;
}

module.exports = {
  createResilientClient,
  DEFAULT_TIMEOUT
};