const crypto = require("crypto");

export const localEncoding = "utf8";
export const transmissionEncoding = "base64";

export const publicEncryptData = (data: string, publicKey: string): string => {
  const buffer = Buffer.from(data, localEncoding);
  const encrypted = crypto.publicEncrypt(publicKey, buffer);
  return encrypted.toString(transmissionEncoding);
};

export const generateChallenge = () => crypto.randomBytes(128).toString();
