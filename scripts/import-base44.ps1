# Lance l'import base44 -> FacturePlus. La clé service_role est demandée en saisie masquée,
# gardée le temps de l'import seulement, jamais écrite sur disque.
#   powershell -ExecutionPolicy Bypass -File scripts\import-base44.ps1 [-Seulement email1,email2]
param([string]$Seulement)

Set-Location (Split-Path $PSScriptRoot -Parent)
$saisie = Read-Host "Cle service_role Supabase (Project Settings > API Keys)" -AsSecureString
$env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($saisie))
try {
  $arguments = @("scripts/import-base44.mjs")
  if ($Seulement) { $arguments += @("--seulement", $Seulement) }
  node @arguments 2>&1 | Tee-Object -FilePath "exports/base44/import-journal.txt"
} finally {
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
}
