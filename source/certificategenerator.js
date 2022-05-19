const fs = require('fs');
const selfsigned = require('selfsigned');
const logger = require(`./../plugins/utilities/logger`);

class CertificateGenerator {
    constructor() {
        this.certDir = process.cwd() + "/user/certs/";
        this.certFile = this.certDir + "cert.pem";
        this.keyFile = this.certDir + "key.pem";
    }
    /**
     * 
     * @param {string} serverIp 
     * @returns 
     */
    generate(serverIp) {
        if (fs.existsSync(this.certFile) && fs.existsSync(this.keyFile)) {
            const cert = fs.readFileSync(this.certFile, 'utf-8');
            const key = fs.readFileSync(this.keyFile, 'utf-8');
            return { cert, key };
        }

        // create directory if not exists
        if (!fs.existsSync(this.certDir)) {
            fs.mkdirSync(this.certDir);
        }

        let fingerprint, cert, key;

        ({
            cert,
            private: key,
            fingerprint,
        } = selfsigned.generate(null, {
            keySize: 2048, // the size for the private key in bits (default: 1024)
            days: 365, // how long till expiry of the signed certificate (default: 365)
            algorithm: "sha256", // sign the certificate with specified algorithm (default: 'sha1')
            // extensions: [{ name: "commonName", cA: true, value: this.ip + "/" }], // certificate extensions array
            extensions: [{ name: "commonName", cA: true, value: serverIp + "/" }], // certificate extensions array
            pkcs7: true, // include PKCS#7 as part of the output (default: false)
            clientCertificate: true, // generate client cert signed by the original key (default: false)
            clientCertificateCN: "jdoe", // client certificate's common name (default: 'John Doe jdoe123')
        }));

        logger.logInfo(`Generated self-signed sha256/2048 certificate ${fingerprint}, valid 365 days`);

        fs.writeFileSync(this.certFile, cert);
        fs.writeFileSync(this.keyFile, key);

        return { cert, key };
    }
}
module.exports.certificate = new CertificateGenerator();