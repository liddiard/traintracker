import crypto from 'crypto'
import { DateTime } from 'luxon'
import { FeatureCollection, Point } from 'geojson'
import { amtrakTZCodeToTZDB } from './data'

// Amtrak API decryption constants as reverse engineered in:
// https://github.com/eiiot/amtraker-v3/blob/main/index.ts
// https://suddenlygreg.com/blog/2023-11-02-amtrak-api/
// https://github.com/mgwalker/amtrak-api
// https://gist.github.com/chriswhong/aa4a2911883904310b3c342e76dd6342
const PUBLIC_KEY = '69af143c-e8cf-47f8-bf09-fc1f61e5cc33'
const SALT = '9a3686ac'
const IV = 'c6eb2f7f5c4740c1a2f708fefd947d39'
const MASTER_SEGMENT = 88

export const amtrakDecryptSegment = (content: string, key: string) => {
  // First, we need to convert the base64 content to a buffer
  const ciphertext = Buffer.from(content, 'base64')

  // Derive the key using PBKDF2
  // Note: crypto-js keySize of 4 means 4 words (4 * 4 bytes = 16 bytes)
  const derivedKey = crypto.pbkdf2Sync(
    key,
    Buffer.from(SALT, 'hex'),
    1000, // iterations
    16, // key length in bytes (4 * 4)
    'sha1', // hash algorithm
  )

  // Parse the initialization vector
  const iv = Buffer.from(IV, 'hex')

  // Create the decipher (assuming AES-128-CBC based on IV usage)
  const decipher = crypto.createDecipheriv('aes-128-cbc', derivedKey, iv)

  // Decrypt the content
  let decrypted = decipher.update(ciphertext)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  // Return as UTF-8 string
  return decrypted.toString('utf8')
}

export const amtrakDecryptResponse = (
  data: string,
): FeatureCollection<Point, AmtrakTrainInfoProperties> => {
  const mainContent = data.substring(0, data.length - MASTER_SEGMENT)
  const encryptedPrivateKey = data.substring(data.length - MASTER_SEGMENT)
  const privateKey = amtrakDecryptSegment(
    encryptedPrivateKey,
    PUBLIC_KEY,
  ).split('|')[0]
  const decryptedData = amtrakDecryptSegment(mainContent, privateKey)
  return JSON.parse(decryptedData)
}

export const amtrakParseDate = (
  dateStr: string,
  { tzCode, _24hr = true }: { tzCode: AmtrakTZCode; _24hr?: boolean },
) => {
  // Amtrak API returns dates in two totally different formats, because of course it does:
  // - 24hr: MM/DD/YYYY HH:MM:SS
  // - 12hr: M/D/YYYY h:MM:SS AM/PM
  const inputFormat = _24hr ? 'MM/dd/yyyy HH:mm:ss z' : 'M/d/yyyy h:mm:ss a z'
  return DateTime.fromFormat(
    `${dateStr} ${amtrakTZCodeToTZDB[tzCode]}`,
    inputFormat,
  ).toJSDate()
}
