import {
  generateChallenge,
  localEncoding,
  publicEncryptData,
  transmissionEncoding,
} from "./cryptography";

const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const publicKeyMismatch = "WARNING: Sender key mismatch.";

const { argv } = yargs(hideBin(process.argv))
  .option("port", {
    describe: "Port to bind on",
    default: 3000,
  })
  .option("greeting", {
    describe: "Message to display on join",
    default: "Connected!",
  })
  .option("verbose", {
    alias: "v",
    type: "boolean",
    description: "Run with verbose logging",
  });

io.use((socket: any, next: any) => {
  socket.publicKey = socket.handshake.auth.publicKey;
  return next();
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
      socket.emit("hello", argv.greeting);
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
