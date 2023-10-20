/*
 * Copyright (c) 2023. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

class CryptoUtil {

    static CRYPTO_SALT_BUFFER = this._bytes2ab([89,113,135,234,168,204,21,36,55,93,1,132,242,242,192,156]);
    // static CRYPTO_IV_BUFFER = this._bytes2ab([124, 106, 192, 13, 63, 204, 204, 117, 138, 251, 184, 239, 35, 23, 69, 170]);

    static PBKDF2_ALGORITHM = {
        name: "PBKDF2",
        salt: this.CRYPTO_SALT_BUFFER,
        iterations: 100000,
        hash: "SHA-256"
    }

    static RSA_OAEP_ALGORITHM = {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
    };

    static AES_GCM_KEY_ALGORITHM = {
        name: "AES-GCM",
        length: 256,
        // iv: this.CRYPTO_IV_BUFFER
        iv: window.crypto.getRandomValues(new Uint8Array(12))
    };

    static WRAP_UNWRAP_PK_FORMAT = "pkcs8";
    static SUBJECT_PUBLIC_KEY_INFO_FORMAT = "spki";
    static IMPORT_RAW_FORMAT = "raw";

    /** @type {KeyUsage[]} */
    static KEY_USAGE_DERIVE = ["deriveBits", "deriveKey"];
    /** @type {KeyUsage[]} */
    static KEY_USAGE_WRAP_UNWRAP = ["wrapKey", "unwrapKey"];
    /** @type {KeyUsage[]} */
    static KEY_USAGE_ENCRYPT_DECRYPT = ["encrypt", "decrypt"];
    /** @type {KeyUsage[]} */
    static KEY_USAGE_DECRYPT = ["decrypt"];
    /** @type {KeyUsage[]} */
    static KEY_USAGE_ENCRYPT = ["encrypt"];

    static PEM_HEADER = "-----BEGIN PUBLIC KEY-----";
    static PEM_FOOTER = "-----END PUBLIC KEY-----";

    static EXTRACTABLE_TRUE = true;
    static EXTRACTABLE_FALSE = false;

    static UTF8_ENCODER = new TextEncoder();
    static UTF8_DECODER = new TextDecoder();


    /**
     * Encrypt plain text using a publicKey.
     *
     * @param {CryptoKey} publicKey key for encrypting plain text
     * @param {String} plaintext text to encrypt
     * @returns {Promise<ArrayBuffer>} encrypted text
     */
    static encrypt(publicKey, plaintext) {
        return window.crypto.subtle.encrypt(
            this.RSA_OAEP_ALGORITHM,
            publicKey,
            this.UTF8_ENCODER.encode(plaintext)
        );
    }

    /**
     * Decrypt a ciphertext using the provided encrypted privateKey and password.
     *
     * @param {String} password password for decrypting the privateKey
     * @param {ArrayBuffer} wrappedPrivateKey key for decrypting the ciphertext
     * @param {ArrayBuffer} ciphertext encrypted text
     * @returns {Promise<String>} unencrypted text
     */
    static decrypt(password, wrappedPrivateKey, ciphertext) {
        return new Promise((resolve, reject) => {
            this._getWrappingKey(password).then( (wrappingKey) => {
                window.crypto.subtle.unwrapKey(
                    this.WRAP_UNWRAP_PK_FORMAT,
                    wrappedPrivateKey,
                    wrappingKey,
                    this.AES_GCM_KEY_ALGORITHM,
                    this.RSA_OAEP_ALGORITHM,
                    this.EXTRACTABLE_TRUE,
                    this.KEY_USAGE_DECRYPT
                ).then( (unwrappedPrivateKey) => {
                    window.crypto.subtle.decrypt(
                        this.RSA_OAEP_ALGORITHM,
                        unwrappedPrivateKey,
                        ciphertext
                    ).then( (decryptedArrayBuffer) => {
                        resolve(this.UTF8_DECODER.decode(decryptedArrayBuffer));
                    });
                });
            });
        });
    }

    /**
     * Generate a public/private keypair, encrypt (wrap) the privateKey using the provided password.
     *
     * @param password
     * @returns {Promise<keypair>}
     */
    static generateKeypair(password) {
        return new Promise((resolve, reject) => {
            window.crypto.subtle.generateKey(
                this.RSA_OAEP_ALGORITHM,
                this.EXTRACTABLE_TRUE,
                this.KEY_USAGE_ENCRYPT_DECRYPT
            ).then( (keyPair) => {
                this._getWrappingKey(password).then( (wrappingKey) => {
                    window.crypto.subtle.wrapKey(
                        this.WRAP_UNWRAP_PK_FORMAT,
                        keyPair["privateKey"],
                        wrappingKey,
                        this.AES_GCM_KEY_ALGORITHM
                    ).then( (wrappedPrivateKey) => {
                        const result = {
                            "publicKey": keyPair["publicKey"],
                            "wrappedPrivateKey": wrappedPrivateKey
                        }
                        resolve(result);
                    });
                });
            });
        });
    }

    /**
     * Derive a key based on a given password for encrypting a private key.
     *
     * @param {String} password
     * @returns {Promise<CryptoKey>}
     * @private
     */
    static _getWrappingKey(password) {
        return new Promise((resolve, reject) => {
            window.crypto.subtle.importKey(
                this.IMPORT_RAW_FORMAT,
                this.UTF8_ENCODER.encode(password),
                this.PBKDF2_ALGORITHM,
                this.EXTRACTABLE_FALSE,
                this.KEY_USAGE_DERIVE
            ).then( (keyMaterial) => {
                window.crypto.subtle.deriveKey(
                    this.PBKDF2_ALGORITHM,
                    keyMaterial,
                    this.AES_GCM_KEY_ALGORITHM,
                    this.EXTRACTABLE_TRUE,
                    this.KEY_USAGE_WRAP_UNWRAP
                ).then( (wrappingKey ) => {
                    resolve(wrappingKey);
                });
            });
        });
    }

    /**
     * Export a binary privateKey so it can be stored offline.
     *
     * @param {ArrayBuffer} privateKey binary privateKey
     * @returns {string} base64 encoded privateKey
     */
    static exportPrivateKey(privateKey) {
        return btoa(this._ab2str(privateKey));
    }

    /**
     * Import a privateKey so it can be used for decryption.
     *
     * @param {String} privateKey base64 encoded privateKey
     * @returns {ArrayBuffer}  privateKey object
     */
    static importPrivateKey(privateKey) {
        return _str2ab(atob(privateKey));
    }

    /**
     * Export a binary privateKey so it can be stored offline.
     *
     * @param {CryptoKey} publicCryptoKey publicKey object
     * @returns {Promise<String>} publicKey string in PEM format
     */
    static exportPublicKey(publicCryptoKey) {
        return new Promise((resolve, reject) => {
            window.crypto.subtle.exportKey(
                this.SUBJECT_PUBLIC_KEY_INFO_FORMAT,
                publicCryptoKey
            ).then((exportedPubKey) => {
                const exportedAsBase64 = btoa(this._ab2str(exportedPubKey));
                const pemExported = `${this.PEM_HEADER}\n${exportedAsBase64}\n${this.PEM_FOOTER}`;
                resolve(pemExported);
            });
        });
    }

    /**
     * Import a publicKey so it can be used for encryption.
     *
     * @param {String} publicPemKey publicKey string in PEM format
     * @returns {Promise<CryptoKey>} publicKey object
     */
    static importPublicKey(publicPemKey) {
        return new Promise((resolve, reject) => {
            // fetch the part of the PEM string between header and footer
            const pemContents = publicPemKey.substring(this.PEM_HEADER.length, publicPemKey.length - this.PEM_FOOTER.length);
            const binaryDer = this._str2ab(atob(pemContents));
            crypto.subtle.importKey(
                this.SUBJECT_PUBLIC_KEY_INFO_FORMAT,
                binaryDer,
                this.RSA_OAEP_ALGORITHM,
                this.EXTRACTABLE_TRUE,
                this.KEY_USAGE_ENCRYPT
            ).then((pubKey) => {
                resolve(pubKey);
            });
        });
    }

    /**
     * Convert Arraybuffer to String.
     * @param {ArrayBuffer} arrayBuffer
     * @returns {string}
     * @private
     */
    static _ab2str(arrayBuffer) {
        return String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
    }

    /**
     * Convert String to ArrayBuffer.
     * @param {String} str
     * @returns {ArrayBuffer}
     * @private
     */
    static _str2ab(str) {
        const arrayBuffer = new ArrayBuffer(str.length);
        const bufView = new Uint8Array(arrayBuffer);
        for (let i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return arrayBuffer;
    }

    /**
     * Convert number[] to ArrayBuffer.
     * @param {number[]} bytes
     * @returns {ArrayBuffer}
     * @private
     */
    static _bytes2ab(bytes) {
        const arrayBuffer = new ArrayBuffer(bytes.length);
        const bufView = new Uint8Array(arrayBuffer);
        bufView.set(bytes);
        return arrayBuffer;
    }
}
