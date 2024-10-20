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
        { name: 'backup', alias: 'b', type: Boolean, defaultValue: false }
    ])

    if(args.input === null || args.output === null) return console.error('Input directory and Output directory must be set! ')

    if(args.password === null) return console.error('[Required] Missing or Invalid password!')
    if(!Array.isArray(args?.fileTypes) || args?.fileTypes?.length === 0) return console.error('[Required] Missing file types to encrypt!')

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
        await DecryptData(args.input, args.output, args.password, args.removeOriginal)
        
        console.log(clc.blueBright('Decryption done!'))
    }

    if(!args.encrypt && !args.decrypt) {
        console.error('No encryption/decryption has be done! Use flags --encrypt -e or --decrypt -d!')
    }

    console.timeEnd(timeTag)
    
}

main()