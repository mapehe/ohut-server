import { localEncoding, transmissionEncoding } from "./cryptography";

const fs = require("fs");
const crypto = require("crypto");

export const validPublicKey = (key: string): boolean => {
  try {
    const verifier = crypto.createVerify("RSA-SHA512");
    verifier.update("__JUNK__");
    verifier.verify(
      Buffer.from(key, localEncoding),
      Buffer.from("__JUNK___", transmissionEncoding)
    );
    return true;
  } catch (e) {
    return false;
  }
};

export const getTrustedKeys = (trustedKeysDir: string): string[] =>
  fs
    .readdirSync(trustedKeysDir)
    .map((filename: string) => {
      try {
        return {
          name: filename,
          key: fs.readFileSync(`${trustedKeysDir}/${filename}`).toString(),
        };
      } catch {
        return { name: "", key: "" };
      }
    })
    .filter(({ key }: any) => validPublicKey(key));
