[System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms")
$certificateToInstallPath = $PWD.Path + "\user\certs\cert.pem" 
$certs = Get-ChildItem -Path cert:\CurrentUser\Root
$found = $false

foreach($cert in $certs) {
    $certPath = "cert:\CurrentUser\Root\" + $cert.Thumbprint
    if($cert.Subject -eq "O=MTGA, CN=MGTA Server") {
        $certificateToInstall = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 $certificateToInstallPath
        if($cert.Thumbprint -eq $certificateToInstall.Thumbprint) {
            if(Test-Certificate -AllowUntrustedRoot -Cert $certPath) {
                if((get-date $cert.NotAfter) -lt (Get-Date)) {
                    $msgBoxInput =  [System.Windows.Forms.MessageBox]::Show("The certificate has to be renewed, after closing this popup box, you will be askted to remove the old certificate. Please press yes so a new one can be installed.","Certificate invalid.",0)
                    Remove-Item -Path $certPath
                } else {
                    $found = $true
                }
            } else {
                $msgBoxInput =  [System.Windows.Forms.MessageBox]::Show("The certificate has to be renewed, after closing this popup box, you will be askted to remove the old certificate. Please press yes so a new one can be installed.","Certificate invalid.",0)
                Remove-Item -Path $certPath
            }
        } else {
            $msgBoxInput =  [System.Windows.Forms.MessageBox]::Show("The certificate has to be renewed, after closing this popup box, you will be askted to remove the old certificate. Please press yes so a new one can be installed.","Certificate invalid.",0)
            Remove-Item -Path $certPath
        }
    }
}

if(!$found) {
    $msgBoxInput =  [System.Windows.Forms.MessageBox]::Show("After closing this popup box, you will be asked to install a new certificate. This certificate is required for the tarkov client to connect to the websocket server. Without this, some functions will not work. The certificate is valid for 3 days. This is a potential security issue and could be abused. We will try to change this as soon as we find someone to take over the binary part of this project.","Certificate installation required",0)
    Import-Certificate -FilePath $certificateToInstallPath -CertStoreLocation cert:\CurrentUser\Root
}
