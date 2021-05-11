import { createPublicKey, publicEncrypt } from 'crypto'
import { generateChallenge, encoding, checkSolution } from './cryptography'

const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const fs = require('fs')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const publicKeyMismatch = 'WARNING: Sender key mismatch.'

const { argv } = yargs(hideBin(process.argv))
  .option('port', {
    describe: 'Port to bind on',
    default: 3000
  })
  .option('greetings-file', {
    describe:
      'A file containing a greeting that is displayed a client upon connect.'
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging'
  })

const greeting = (() => {
  try {
    return fs.readFileSync(argv.greetingsFile).toString()
  } catch {
    return 'Connected!'
  }
})()

io.use((socket: any, next: any) => {
  socket.room = socket.handshake.auth.publicKey
  return next()
})

io.on('connection', (socket: any) => {
  const { room } = socket
  const publicKey = createPublicKey(room)
  const challenge = generateChallenge()
  const encryptedChallenge = publicEncrypt(publicKey, challenge)
  socket.emit('challenge', encryptedChallenge)
  socket.on('solution', (solution: Buffer) => {
    if (checkSolution(challenge, solution)) {
      socket.join(room)
      socket.emit('hello', greeting)
      socket.on('patch', (patch: any) => {
        if (
          patch.senderKey.toString(encoding) ===
          publicKey.export({ format: 'pem', type: 'pkcs1' }).toString()
        ) {
          if (argv.verbose) {
            console.log(patch)
          }
          const destinationRoom = patch.destinationKey.toString(encoding)
          socket.to(destinationRoom).emit('patch', patch)
        }
        socket.emit('error', new Error(publicKeyMismatch))
      })
    } else {
      socket.disconnect()
    }
  })
})

http.listen(argv.port, () => {
  console.log(`ohut-server listening to port ${argv.port}`)
})
