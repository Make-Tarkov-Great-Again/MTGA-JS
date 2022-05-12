const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

class CertificateGenerator {
    
    constructor(){
        this.allowUnauthorized();

        this.certDir = path.join(__dirname, '..', 'Local', 'Cert');
        this.certFile = path.join(this.certDir, 'server.cert');
        this.keyFile = path.join(this.certDir, 'server.key');
        this.KEY = {};
        this.CERT = {};
        if(!fs.existsSync(this.certFile) || !fs.existsSync(this.keyFile))
        {
            this.regenerate();
        } else {
            this.KEY = fs.readFileSync(this.keyFile, { encoding:'utf8', flag:'r' } );
            this.CERT = fs.readFileSync(this.certFile, { encoding:'utf8', flag:'r' } );
        }
    }

    allowUnauthorized(){
        process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
    }
    regenerate(){
        if (!fs.existsSync(this.certDir)) {
            fs.mkdir(this.certDir, (err) => {
                if (err) {
                    return console.error(err);
                }
            });
        }

        let fingerprint, cert, key;
        ({
            cert,
            private: key,
            fingerprint,
          } = selfsigned.generate(null, {
            keySize: 4096, // the size for the private key in bits (default: 1024)
            days: 365, // how long till expiry of the signed certificate (default: 365)
            algorithm: "sha256", // sign the certificate with specified algorithm (default: 'sha1')
            extensions: [{ name: "commonName", cA: true, value: "127.0.0.1" }], // certificate extensions array
            pkcs7: true, // include PKCS#7 as part of the output (default: false)
            clientCertificate: true, // generate client cert signed by the original key (default: false)
            clientCertificateCN: "jdoe", // client certificate's common name (default: 'John Doe jdoe123')
          }));

          //key = key.replace("\r\n", "");
          //cert = cert.replace("\r\n", "");

        this.KEY = key;
        this.CERT = cert;

        fs.writeFileSync(this.certFile, cert, { encoding: 'utf8'});
        fs.writeFileSync(this.keyFile, key, { encoding: 'utf8'});
    }
}
module.exports = new CertificateGenerator();