/**
 * Firebase Cloud Function - Generic HTTP Proxy with CORS support
 * Forwards HTTP requests to external APIs with security controls
 */

const functions = require('firebase-functions');
const cors = require('cors')({origin: true});
const fetch = require('node-fetch');

// Configuration from Firebase environment
const API_KEY = functions.config().proxy?.apikey || null;
const ALLOWED_DOMAINS = functions.config().proxy?.domains?.split(',') || [];

// Error message constants
const ERRORS = {
  INVALID_API_KEY: 'Invalid API key',
  URL_REQUIRED: 'URL required',
  DOMAIN_NOT_ALLOWED: 'Domain not allowed',
  INVALID_URL_FORMAT: 'Invalid URL format',
  PROXY_REQUEST_FAILED: 'Proxy request failed'
};

/**
 * Validates URL format and checks against allowed domains
 * @param {string} url - The URL to validate
 * @returns {Object} - {valid: boolean, error?: string}
 */
function validateUrl(url) {
  if (!url) return { valid: false, error: ERRORS.URL_REQUIRED };

  try {
    const urlObj = new URL(url);
    if (!ALLOWED_DOMAINS.includes(urlObj.hostname)) {
      return { valid: false, error: ERRORS.DOMAIN_NOT_ALLOWED };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: ERRORS.INVALID_URL_FORMAT };
  }
}

/**
 * Parses response data based on content-type header
 * @param {Response} response - Fetch API response object
 * @returns {Promise<Object|string>} - Parsed JSON object or text string
 */
async function parseResponseData(response) {
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    return await response.json();
  } else {
    return await response.text();
  }
}

/**
 * Generic HTTP Proxy Cloud Function
 *
 * Accepts HTTP requests and forwards them to external APIs with:
 * - API key authentication
 * - Domain whitelisting
 * - Header forwarding (x-target-* → target API)
 * - Automatic response parsing (JSON/text)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.proxy = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Authenticate request using API key
      if (!API_KEY || req.headers['x-api-key'] !== API_KEY) {
        return res.status(401).json({ error: ERRORS.INVALID_API_KEY });
      }

      // Extract target URL and body from query params or request body
      const url = req.query?.url || req.body?.url;
      const body = req.query?.body || req.body?.body;
      const headers = {};

      // Validate URL format and domain whitelist
      const urlValidation = validateUrl(url);
      if (!urlValidation.valid) {
        return res.status(400).json({ error: urlValidation.error });
      }

      // Forward x-target-* headers to target API (removes x-target- prefix)
      Object.keys(req.headers).forEach(key => {
        if (key.startsWith('x-target-')) {
          headers[key.replace('x-target-', '')] = req.headers[key];
        }
      });

      // Make proxied request to target API
      const response = await fetch(url, {
        method: req.method,
        headers,
        body
      });

      // Parse response based on content-type
      const data = await parseResponseData(response);

      // Return standardized response
      res.json({
        status: response.status,
        data: data
      });

    } catch (error) {
      res.status(500).json({ error: ERRORS.PROXY_REQUEST_FAILED });
    }
  });
});
