const crypto = require('crypto')

export const encoding = 'utf-8'
const hashAlgorithm = 'sha256'

const hashData = (data: Buffer) =>
  crypto.createHash(hashAlgorithm).update(data).digest()

export const generateChallenge = () => crypto.randomBytes(128)

export const checkSolution = (challenge: Buffer, solution: Buffer): boolean =>
  solution.equals(hashData(challenge))
