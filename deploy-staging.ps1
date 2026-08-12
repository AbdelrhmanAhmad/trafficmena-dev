param(
  [string]$SshHost = "root@178.105.196.164",
  [string]$KeyPath = "$env:USERPROFILE\.ssh\id_ed25519_trafficmena_staging"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $KeyPath)) {
  Write-Error "SSH key not found: $KeyPath"
}

$remoteScript = @'
set -e
cd /var/www/trafficmena-dev/
git pull
npm install
npm --prefix server install
npm --prefix server run db:migrate
npm --prefix server run build
npm run build
pm2 restart all
'@

Write-Host "Deploying to $SshHost ..."
ssh -i $KeyPath $SshHost $remoteScript
Write-Host "Done."
#.\deploy-staging.ps1