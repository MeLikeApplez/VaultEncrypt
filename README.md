# Vault Encrypt

Vault Encrypt is a simple command line utility to encrypt and decrypt files using NodeJS. 
## Run Locally

Clone the project

```bash
  git clone https://github.com/MeLikeApplez/VaultEncrypt.git
```

Go to the project directory

```bash
  cd VaultEncrypt
```

Install dependencies

```bash
  npm install
```

(EXAMPLE) Start the script

```bash
  node ./Main.js --<arguments>
```

```bash
  node ./Main.js -i "./myFolder" -o "/myOutput/encryptFileName" -p "mySecretPassword" --encrypt
  -t "image/*" --removeOriginal
```


## Environment Variables

- This part is completely optional and only used when to run the project quicker without typing out commands over and over again
- To use Environment Variables, use the "--loadenv" or "-l" in the command line to use it.
- Passwords must be specify in the command line, NOT THE ENVIRONMENT VARIABLES.
- To run this project, you will need to add the following environment variables to your .env file

`INPUT_ENCRYPT_DIR=""` specify input directory here

`INPUT_DECRYPT_DIR=""` specify input directory here

- DO NOT PUT A FILE EXTENSTION (.json, .txt, .png)
`OUTPUT_ENCRYPT_DIR=""` specify output directory here (Example: "./documents/<filename>")

`OUTPUT_DECRYPT_DIR=""` specify output directory here (Example: "./documents/<filename>")

`REMOVE_ORIGINAL="false"` "true" or "false"

`ENCRYPT="false"` "true" or "false"

`DECRYPT="false"` "true" or "false"

- Seperate files types using commas
`FILE_TYPES=""` Example: image/*, text/*
# Command Argument Line Reference

| Argument             | Definition                                                                |
| ----------------- | ------------------------------------------------------------------ |
| -r --removeOriginal | Removes input file file picked by user in encryption or decryption |
| -p --password | Password to encrypt or decrypt files |
| -t --fileTypes | Mimetypes to search for specific file types (https://developer.mozilla.org/en-US/docs/Web/HTTP/MIME_types/Common_types) |
| -e --encrypt | Encrypt files using password given |
| -d --decrypt | Decrypt files using password given |
| -i --input | Set input directory target |
| -o --output | Set output directory target |
| -l --loadenv | Use ENV Variables instead of command line arguments |
| -b --backup | Creates a backup encrypted file. Just a copy of the encrypted file |
| -s --skipHash | Skips hash and SHA256 check when verifying decryption. Use only when verification needs to be skipped |

