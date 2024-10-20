const path = require('path')
const fs = require('fs')
const fsPromise = require('fs/promises')
const { Readable } = require('stream')

const mime = require('mime-type/with-db').default
const dree = require('dree')
const folderEncrypt = require('folder-encrypt')
const clc = require('cli-color')
const AdmZip = require('adm-zip')

const ENCRYPTION_EXTENSTION = '.encjs'
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

        if(Array.isArray(folderTree.children)) {
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

        if(fulfilled.length > 0) {
            console.log(
                clc.greenBright(`${fulfilled.length} File${fulfilled.length > 0 ? 's' : ''} Encrypted`)
            )
        }

        if(failed.length > 0) {
            console.error(`${failed.length} Failed to Encrypt`)
            console.error('Check Log Error File!')
        
            logErrors(failed.map(data => `[${data.status}]: ${data.reason}`))
        } else if(folderTree.children && folderTree.children.length > 0) {
            const finalOutputPath = path.join(__dirname, outputPath + ENCRYPTION_EXTENSTION)

            await folderEncrypt.encrypt({
                input: TEMP_ENCRYPT_DIR,
                output: finalOutputPath,
                password: password
            })

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
 */
async function DecryptData(inputPath, outputPath, password, removeOriginal=false) {
    try {
        console.log(
            clc.cyan(`\nDecrypting file: "${inputPath}"`)
        )

        await folderEncrypt.decrypt({
            input: inputPath,
            output: outputPath,
            password: password
        })

        if(removeOriginal) {
            await fsPromise.rm(inputPath)
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