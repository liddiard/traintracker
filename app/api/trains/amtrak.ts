import crypto from 'crypto'

const sValue = '9a3686ac'
const iValue = 'c6eb2f7f5c4740c1a2f708fefd947d39'
const publicKey = '69af143c-e8cf-47f8-bf09-fc1f61e5cc33'
const masterSegment = 88
const dataUrl =
  'https://maps.amtrak.com/services/MapDataService/trains/getTrainsData'

const decrypt = (content: string, key: string) => {
  // First, we need to convert the base64 content to a buffer
  const ciphertext = Buffer.from(content, 'base64')

  // Derive the key using PBKDF2
  // Note: crypto-js keySize of 4 means 4 words (4 * 4 bytes = 16 bytes)
  const derivedKey = crypto.pbkdf2Sync(
    key,
    Buffer.from(sValue, 'hex'),
    1000, // iterations
    16, // key length in bytes (4 * 4)
    'sha1', // hash algorithm
  )

  // Parse the initialization vector
  const iv = Buffer.from(iValue, 'hex')

  // Create the decipher (assuming AES-128-CBC based on IV usage)
  const decipher = crypto.createDecipheriv('aes-128-cbc', derivedKey, iv)

  // Decrypt the content
  let decrypted = decipher.update(ciphertext)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  // Return as UTF-8 string
  return decrypted.toString('utf8')
}

const get = async () => {
  const response = await fetch(dataUrl + `?${Date.now()}=true`)
  const data = await response.text()

  const mainContent = data.substring(0, data.length - masterSegment)
  const encryptedPrivateKey = data.substr(
    data.length - masterSegment,
    data.length,
  )
  const privateKey = decrypt(encryptedPrivateKey, publicKey).split('|')[0]
  const decryptedData = decrypt(mainContent, privateKey)
  return JSON.parse(decryptedData)
}

export default get
