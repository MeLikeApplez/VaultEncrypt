const path = require('path')
const fs = require('fs')
const fsPromise = require('fs/promises')
const { Readable } = require('stream')
const crypto = require('crypto')

const mime = require('mime-type/with-db').default
const dree = require('dree')
const folderEncrypt = require('folder-encrypt')
const clc = require('cli-color')
const bcrypt = require('bcrypt')

const ENCRYPTION_EXTENSTION = '.encjs'
const HASH_EXTENSTION = '-encjshash'
const ERROR_LOG_PATH = path.join(__dirname, 'Errors.txt')

const TEMP_ENCRYPT_DIR = './__temp_encjs__'

/**
 * @param {Array<any>} data 
 */
async function PromiseResults(data) {
    data = await Promise.allSettled(data)

    const fulfilled = []
    const failed = []
    for(let i = 0; i < data.length; i++) {
        const { status, value } = data[i]
    
        if(status === 'fulfilled') {
            fulfilled.push(value)
        } else {
            failed.push(data[i])
        }
    }

        return { fulfilled, failed }
}

function logErrors(messages=[]) {
    try {
        const date = new Date().toString() + '\n'
        const dataStream = new Readable()
        const writeStream = fs.createWriteStream(ERROR_LOG_PATH)

        dataStream._read = () => {}

        dataStream.push(date)
        for(let i = 0; i < messages.length; i++) {
            dataStream.push(messages[i] + '\n')
        }

        dataStream.pipe(writeStream)
    } catch(error) {
        console.error(error)
    }

}

/**
 * @param {string} encryptedFilePath 
 * @param {string} destFileName 
 * @param {string} password 
 */
async function createDataConfigFile(encryptedFilePath, destFileName, password) {
    try {
        destFileName += '-encjshash'

        const destPath = path.join(__dirname, destFileName + '.json')
        const encryptedFileStream = fs.createReadStream(encryptedFilePath, 'binary')
        const sha256Hash = crypto.createHash('sha256')

        encryptedFileStream.pipe(sha256Hash)
        
        const configData = {
            access_hash: await bcrypt.hash(password, 12),
            sha256: sha256Hash.digest('hex')
        }

        await fsPromise.writeFile(destPath, JSON.stringify(configData, null, 4))

        return [destPath, null]
    } catch(error) {
        console.error(error)
        console.error('Failed to create a data config file!')
    
        return [null, error]
    }
}

/**
 * @param {string} inputPath 
 * @param {string} outputPath 
 * @param {string} password 
 * @param {Array<string>} mimeTypes 
 * @param {boolean} [removeOriginal=false] 
 * @param {boolean} [backup=false] 
 */
async function EncryptData(inputPath, outputPath, password, mimeTypes, removeOriginal=false, backup=false) {
    try {
        const folderTree = await dree.scanAsync(inputPath)
        const globs = mimeTypes.map(type => mime.glob(type))
        let encryptionList = []

        if(Array.isArray(folderTree?.children)) {
            const tempDirScan = await dree.scanAsync(TEMP_ENCRYPT_DIR)

            if(tempDirScan === null) {
                await fsPromise.mkdir(TEMP_ENCRYPT_DIR)
            }

            for(let i = 0; i < folderTree.children.length; i++) {
                const file = folderTree.children[i]

                if(folderTree.children.some(f => f.name.includes(ENCRYPTION_EXTENSTION))) continue

                const fileTypeMatch = globs.some(glob => glob.includes(mime.lookup(file.name)))
                
                if(!fileTypeMatch) continue

                console.log(
                    clc.cyan(`Encrypting file: "${file.relativePath}"`)
                )

                const encryptionAsync = new Promise((res, rej) => {
                    const newFilePath = path.join(__dirname, TEMP_ENCRYPT_DIR, file.name)
                    
                    fsPromise.rename(file.path, newFilePath).then(() => {
                        res(file.name)
                    }).catch(rej)
                })

                encryptionList.push(encryptionAsync)
            }
        }

        const { fulfilled, failed } = await PromiseResults(encryptionList)

        console.log(
            clc.greenBright(`${fulfilled.length} File${fulfilled.length !== 1 ? 's' : ''} Encrypted`)
        )

        if(failed.length > 0) {
            console.error(`${failed.length} Failed to Encrypt`)
            console.error('Check Log Error File!')
        
            logErrors(failed.map(data => `[${data.status}]: ${data.reason}`))
        } else if(folderTree?.children?.length > 0) {
            const finalOutputPath = path.join(__dirname, outputPath + ENCRYPTION_EXTENSTION)

            await folderEncrypt.encrypt({
                input: TEMP_ENCRYPT_DIR,
                output: finalOutputPath,
                password: password
            })

            const [ config, configError ] = await createDataConfigFile(finalOutputPath, outputPath, password)

            if(configError) throw configError

            if(backup) {
                await fsPromise.copyFile(finalOutputPath, path.join(__dirname, outputPath + '-backup' + ENCRYPTION_EXTENSTION))
            }

            if(removeOriginal) {
                await fsPromise.rm(TEMP_ENCRYPT_DIR, { recursive: true, force: true })
            } else {
                const tempDirScan = await dree.scanAsync(TEMP_ENCRYPT_DIR)

                if(Array.isArray(tempDirScan?.children)) {
                    for(let i = 0;  i < tempDirScan.children.length; i++) {
                        const file = tempDirScan.children[i]
                        const newFilePath = path.join(__dirname, inputPath, file.name)

                        fsPromise.rename(file.path, newFilePath).catch(err => { throw err })
                    }
                }
            }

        }
    } catch(error) {
        console.error(error)

        return [null, error]
    }
}

/**
 * @param {string} inputPath 
 * @param {string} outputPath 
 * @param {string} password 
 * @param {boolean} [removeOriginal=false] 
 * @param {boolean} [skipHash=false] 
 */
async function DecryptData(inputPath, outputPath, password, removeOriginal=false, skipHash=false) {
    try {
        console.log(
            clc.cyan(`\nDecrypting file: "${inputPath}"`)
        )

        const configFileName = inputPath.replace(/\.\w+/g, '') + HASH_EXTENSTION + '.json'
        const configScan = await dree.scanAsync(configFileName)

        if(!skipHash) {
            if(configScan === null) {
                throw Error('JSON Hash file has been tampered! Use the "--skipHash" flag to skip encryption verification!')
            }

            const configFile = await fsPromise.readFile(configFileName, 'utf-8')
            const configData = JSON.parse(configFile)

            if(!('access_hash' in configData) || !('sha256' in configData)) {
                throw Error('JSON Hash file has been tampered! Use the "--skipHash" flag to skip encryption verification!')
            }

            console.log(
                clc.magentaBright('Verifying password and SHA256 hash...\n')
            )

            const bcryptPasswordCheck = await bcrypt.compare(password, configData.access_hash)

            if(!bcryptPasswordCheck) {
                return console.error('Password hash check failed! Incorrect password!\n')
            } else {
                console.log(
                    clc.greenBright('Password hash check passed!')
                )
            }

            const stream = fs.createReadStream(inputPath, 'binary')
            const sha256Hash = crypto.createHash('sha256')

            const digest = await new Promise((res, rej) => {
                stream.pipe(sha256Hash).on('finish', () => {
                    res(sha256Hash.digest())
                }).on('error', rej)
            })

            const configDigest = Buffer.from(configData.sha256, 'hex')

            if(!crypto.timingSafeEqual(digest, configDigest)) {
                return console.error('Password hash check failed! Incorrect password!\n')
            } else {
                console.log(
                    clc.greenBright('SHA256 hash check passed!\n')
                )
            }
        }

        await folderEncrypt.decrypt({
            input: inputPath,
            output: outputPath,
            password: password
        })

        if(removeOriginal) {
            await fsPromise.rm(inputPath)
        }

        if(configScan !== null) {
            await fsPromise.rm(configFileName)
        }

        console.log(
            clc.greenBright('File decrypted!\n')
        )
    } catch(error) {
        console.error(error)
        console.log(
            clc.redBright('Failed to decrypt!\n')
        )

        return [null, error]
    }
}

module.exports = {
    EncryptData, DecryptData
}