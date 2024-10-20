console.clear()

require('dotenv').config()

const { EncryptData, DecryptData } = require('./Vault.js')

const mime = require('mime-type/with-db').default
const commandLineArgs = require('command-line-args')
const clc = require('cli-color')

async function main() {
    const args = commandLineArgs([
        { name: 'removeOriginal', alias: 'r', type: Boolean, defaultValue: false },
        { name: 'password', alias: 'p', type: String, defaultValue: null },
        { name: 'fileTypes', alias: 't', type: String, multiple: true },
        { name: 'encrypt', alias: 'e', type: Boolean, defaultValue: false },
        { name: 'decrypt', alias: 'd', type: Boolean, defaultValue: false },
        { name: 'input', alias: 'i', type: String, defaultValue: null },
        { name: 'output', alias: 'o', type: String, defaultValue: null },
        { name: 'loadenv', alias: 'l', type: Boolean, defaultValue: false },
        { name: 'backup', alias: 'b', type: Boolean, defaultValue: false },
        { name: 'skipHash', alias: 's', type: Boolean, defaultValue: false }
    ])

    if(args.loadenv) {
        if(args.skipHash) {
            console.warn('Warning! "Remove Original" flag is being disabled to prevent data loss!')
            args.removeOriginal = false
        } else {
            args.removeOriginal = process.env.REMOVE_ORIGINAL === 'true'
        }

        args.encrypt = process.env.ENCRYPT === 'true'
        args.decrypt = process.env.DECRYPT === 'true'
        args.fileTypes = process.env.FILE_TYPES?.split(',')
    
        if(args.encrypt) {
            args.input = process.env.INPUT_ENCRYPT_DIR
            args.output = process.env.OUTPUT_ENCRYPT_DIR            
        } else if(args.decrypt) {
            args.input = process.env.INPUT_DECRYPT_DIR
            args.output = process.env.OUTPUT_DECRYPT_DIR
        }

    }

    if(args.skipHash) {
        console.warn('Warning! "Remove Original" flag is being disabled to prevent data loss!')
        args.removeOriginal = false
    }

    if(args.input === null || args.output === null) return console.error('Input directory and Output directory must be set! ')

    if(args.password === null) return console.error('[Required] Missing or Invalid password!')
    if(!Array.isArray(args?.fileTypes) || args?.fileTypes?.length === 0) {
        if(args.encrypt) return console.error('[Required] Missing file types to encrypt!')
    }

    if(!args.encrypt && !args.decrypt) {
        return console.error('No encryption/decryption has be done! Use flags --encrypt -e or --decrypt -d!')
    }

    const validFileTypes = []
    const inValidFileTypes = []
    if(args.encrypt) {
        const { fileTypes } = args

        for(let i = 0; i < fileTypes.length; i++) {
            const type = fileTypes[i]
            const glob = mime.glob(type)
                
            if(glob.length > 0) {
                validFileTypes.push(type)
            } else {
                inValidFileTypes.push(type)
            }
        }

        if(validFileTypes.length > 0) {
            console.log(
                clc.greenBright(`Searching for [${validFileTypes.join(', ')}]`)
            )
        }

        if(inValidFileTypes.length > 0) {
            console.log(
                clc.redBright(`Invalid files types! [${inValidFileTypes.join(', ')}]`)
            )

            console.warn('Cannot continue due to invalid file types!')

            return
        }
    }

    const timeTag = clc.yellowBright('Encryption/Decryption')
    console.time(timeTag)

    if(args.encrypt) {
        console.log(clc.blueBright('Encryption in progress...\n'))

        // await encryptFiles(args.removeOriginal, validFileTypes)
        await EncryptData(args.input, args.output, args.password, validFileTypes, args.removeOriginal, args.backup)
        
        console.log(clc.blueBright('\nEncryption done!'))
    }

    if(args.decrypt) {
        console.log(clc.blueBright('Decryption in progress...'))
        
        // await decryptFiles(args.removeOriginal, validFileTypes)
        await DecryptData(args.input, args.output, args.password, args.removeOriginal, args.skipHash)
        
        console.log(clc.blueBright('Decryption done!'))
    }

    console.timeEnd(timeTag)
}

main()