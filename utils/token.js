const crypto = require('crypto');

function generateToken(length = 24) {
  // Base64url encoding to avoid URL-unsafe chars, slice to desired length
  const bytes = crypto.randomBytes(Math.ceil((length * 3) / 4));
  return bytes.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+/g, '')
    .slice(0, length);
}

module.exports = { generateToken };
