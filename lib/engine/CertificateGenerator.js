const fs = require('fs');
const selfsigned = require('selfsigned');
const logger = require(`../../utilities/logger`);

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
    generate(serverIp, serverHostname, certificateDays) {
        if (fs.existsSync(this.certFile) && fs.existsSync(this.keyFile)) {
            const cert = fs.readFileSync(this.certFile, 'utf-8');
            const key = fs.readFileSync(this.keyFile, 'utf-8');
            return { cert, key };
        }

        // create directory if not exists
        if (!fs.existsSync(this.certDir)) {
            fs.mkdirSync(this.certDir, { recursive: true });
        }

        const attributes = [
            {
                name: "commonName",
                value: "MGTA Server"
            },
            {
                name: "organizationName",
                value: "MTGA"
            }
        ];

        let extensions = [
            {
                name: 'subjectAltName',
                altNames: [{
                    type: 2, // DNS
                    value: serverHostname
                }, {
                    type: 7, // IP
                    ip: serverIp
                }]
            }
        ]

        let fingerprint, cert, key;

        ({
            cert,
            private: key,
            fingerprint,
        } = selfsigned.generate(attributes, {
            keySize: 2048, // the size for the private key in bits (default: 1024)
            days: certificateDays, // how long till expiry of the signed certificate (default: 365)
            algorithm: "sha256", // sign the certificate with specified algorithm (default: 'sha1')
            extensions: extensions,
            // extensions: [{ name: "commonName", cA: true, value: this.ip + "/" }], // certificate extensions array // certificate extensions array
            pkcs7: true, // include PKCS#7 as part of the output (default: false)
            clientCertificate: true, // generate client cert signed by the original key (default: false)
            clientCertificateCN: "MTGA", // client certificate's common name (default: 'John Doe jdoe123')
        }));

        logger.info(`Generated self-signed sha256/2048 certificate ${fingerprint}, valid 3 day`);

        fs.writeFileSync(this.certFile, cert);
        fs.writeFileSync(this.keyFile, key);

        return { cert, key, fingerprint };
    }
}
module.exports.certificate = new CertificateGenerator();