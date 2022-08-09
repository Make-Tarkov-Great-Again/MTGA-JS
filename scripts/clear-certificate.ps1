[System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms")
$certificateToCheck = $PWD.Path + "\user\certs\cert.pem"
$certificateToCheckAsCert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 $certificateToCheck

if(Test-Certificate -AllowUntrustedRoot -Cert $certificateToCheckAsCert) {
    if($certificateToCheckAsCert.NotAfter -lt (Get-Date)) {
        Remove-Item -Path $certificateToCheck
    }
} else {
    Remove-Item -Path $certificateToCheck
}