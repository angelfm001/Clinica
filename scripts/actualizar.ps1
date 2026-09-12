<#
  Sincroniza los cambios locales de este proyecto con GitHub:
  https://github.com/angelfm001/Clinica.git

  Hace, en orden: fetch -> add -> commit (si hay cambios) -> pull --rebase -> push.

  Mensaje de commit:
    - Si pasas -Message, se usa ese texto tal cual.
    - Si no, se lee de scripts\commit-message.txt (junto a este script).
    - Si ese archivo no existe o está vacío, se usa una marca de tiempo por defecto.

  Ruta del repo:
    $PSScriptRoot es la carpeta donde vive ESTE archivo .ps1 (siempre,
    sin importar desde dónde lo invoques). Como el script está en
    "<repo>\scripts", subir un nivel con Split-Path -Parent da la raíz
    del repo. Así el script funciona igual si lo corres desde
    "C:\...\Clinica" o desde "C:\...\Clinica\scripts", o desde cualquier
    otra carpeta.

  Uso:
    .\scripts\git-sync.ps1
    .\scripts\git-sync.ps1 -Message "Filtros de pacientes y notificaciones en tiempo real"
    .\scripts\git-sync.ps1 -Branch main -Remote origin
#>
param(
    [string]$Message,
    [string]$Remote = "origin",
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

# Este script vive en <repo>/scripts, así que la raíz del repo es un nivel arriba.
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

# Si no se pasó -Message, se busca scripts\commit-message.txt.
if (-not $Message) {
    $msgFile = Join-Path $PSScriptRoot "commit-message.txt"
    if (Test-Path $msgFile) {
        $Message = (Get-Content -Path $msgFile -Raw).Trim()
    }
}
if (-not $Message) {
    $Message = "Actualizacion $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

Write-Host "Repositorio : $repoRoot"
Write-Host "Remoto      : $Remote"
Write-Host "Rama        : $Branch"
Write-Host "Mensaje     : $Message"
Write-Host ""

# 1) Traer el estado remoto antes de tocar nada.
Write-Host "Sincronizando referencias remotas..."
git fetch $Remote

# 2) Preparar los cambios locales (se excluye la config local de Claude Code).
git add -A -- ':!.claude'

$staged = git diff --cached --name-only
if (-not $staged) {
    Write-Host "No hay cambios locales para commitear. Nada que subir."
    exit 0
}

Write-Host "Archivos a commitear:"
$staged | ForEach-Object { Write-Host "  $_" }
Write-Host ""

# 3) Commit.
git commit -m $Message

# 4) Traer y aplicar el histórico remoto por si alguien más subió cambios,
#    antes de intentar el push (evita un push rechazado).
git pull --rebase $Remote $Branch

# 5) Subir.
git push $Remote $Branch

Write-Host ""
Write-Host "Listo: cambios subidos a $Remote/$Branch."
