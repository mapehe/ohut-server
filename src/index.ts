import {
  generateChallenge,
  localEncoding,
  publicEncryptData,
  transmissionEncoding,
} from "./cryptography";
import { getTrustedKeys } from "./utils";

const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const fs = require("fs");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const publicKeyMismatch = "WARNING: Sender key mismatch.";

const { argv } = yargs(hideBin(process.argv))
  .option("port", {
    describe: "Port to bind on",
    default: 3000,
  })
  .option("greetings-file", {
    describe:
      "A file containing a greeting that is displayed a client upon connect.",
  })
  .option("trusted-keys-dir", {
    describe:
      "A directory containing public key files in pkcs8 format. Only clients with these public keys are allowed to connect.",
  })
  .option("verbose", {
    alias: "v",
    type: "boolean",
    description: "Run with verbose logging",
  });

const greeting = (() => {
  try {
    return fs.readFileSync(argv.greetingsFile).toString();
  } catch {
    return "Connected!";
  }
})();

const trustedKeys = getTrustedKeys(argv.trustedKeysDir);

io.use((socket: any, next: any) => {
  const { publicKey } = socket.handshake.auth.publicKey;
  if (trustedKeys.includes(publicKey) || trustedKeys.length === 0) {
    socket.publicKey = publicKey;
    return next();
  }
  return Error("Unauthorized");
});

io.on("connection", (socket: any) => {
  const { publicKey } = socket;
  const challenge = generateChallenge();
  const encryptedChallenge = publicEncryptData(
    challenge,
    Buffer.from(publicKey, transmissionEncoding).toString(localEncoding)
  );
  socket.emit("challenge", encryptedChallenge);

  socket.on("challenge", (solution: string) => {
    if (solution === challenge) {
      socket.join(socket.publicKey);
      socket.emit("hello", greeting);
      socket.on("patch", (patch: any) => {
        if (patch.senderKey === publicKey) {
          if (argv.verbose) {
            console.log(patch);
          }
          io.to(patch.destinationKey).emit("patch", patch);
        }
        socket.emit("error", new Error(publicKeyMismatch));
      });
    }
  });
});

http.listen(argv.port, () => {
  console.log(`ohut-server listening to port ${argv.port}`);
});
