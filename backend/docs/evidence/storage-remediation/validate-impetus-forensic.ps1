# IMPETUS — Validação SHA256 Forense (Windows)
# Comparar ficheiros transferidos com SOURCE_SHA256_COMPLETE_MANIFEST.txt
# Uso: .\validate-impetus-forensic.ps1 -Path "C:\IMPETUS_TRANSFER_STAGING"
#      .\validate-impetus-forensic.ps1 -Path "E:\IMPETUS_FORENSIC_ARCHIVE"

param(
    [Parameter(Mandatory=$true)]
    [string]$Path
)

$ErrorActionPreference = "Stop"

# Manifesto canónico — 9 ficheiros críticos
$Expected = @{
    "0880756b31aa8387f0f59fe9abb3722a1181b59377caeceb2a981ebd5b0cdf9d" = @(
        "Checkpoint\checkpoint_2026-06-26T1622.sql",
        "checkpoint_2026-06-26T1622.sql"
    )
    "fe8f81cae4ba02c2aa2207847f8ac652a8e994f15abf11baaeeb45a0a44f4e2e" = @(
        "CoreDumps\core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1117038.50429709",
        "core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1117038.50429709"
    )
    "0974572fcbc9be309df5f5882f49c5f0a2c195d458635d73a04486510ec0d1c7" = @(
        "CoreDumps\core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1264763.57180497",
        "core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1264763.57180497"
    )
    "49848113785be1337d01757b4ba6fe79277b4b6ac6b7a9c30f418c12c7fb42e0" = @(
        "CoreDumps\core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1294484.59135010",
        "core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1294484.59135010"
    )
    "4da331b53a02df706e2afd8c5041014a703a98107d23337b3cee28fcbdf8c3ef" = @(
        "CoreDumps\core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1364633.62894624",
        "core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1364633.62894624"
    )
    "261bc1d00b0bf75259177b8e3eb66467fc3fbc36f1614c43a260bed77cd318cb" = @(
        "CoreDumps\core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1389545.64866468",
        "core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1389545.64866468"
    )
    "e0f4e2080fc5ee8f4a6acc02c7684a09102de29a61906513b1c1078992bf7fd6" = @(
        "Logs\IMPETUS_FORENSIC_PM2_LOGS_2026_07.tar.gz",
        "IMPETUS_FORENSIC_PM2_LOGS_2026_07.tar.gz"
    )
    "5a2e372f99966fe54f6b4e59cd0b1631b96f6f01b5db5fe63dbfa515d211b848" = @(
        "Security\IMPETUS_SECURITY_CERTIFICATIONS_2026.tar.gz",
        "IMPETUS_SECURITY_CERTIFICATIONS_2026.tar.gz"
    )
    "1c98ebbb7fa1be5bc29f94b8be00c1a14f5004cd8a0abb9dfe6553e0e3e17b36" = @(
        "Reports\IMPETUS_FORENSIC_EVIDENCE_2026_07.tar.gz",
        "IMPETUS_FORENSIC_EVIDENCE_2026_07.tar.gz"
    )
}

Write-Host "=== IMPETUS Forensic SHA256 Validation ===" -ForegroundColor Cyan
Write-Host "Path: $Path"
Write-Host ""

$results = @()
$pass = 0
$fail = 0
$missing = 0

foreach ($hash in $Expected.Keys) {
    $found = $false
    foreach ($rel in $Expected[$hash]) {
        $full = Join-Path $Path $rel
        if (Test-Path $full) {
            Write-Host "Hashing: $rel ..." -NoNewline
            $actual = (Get-FileHash -Path $full -Algorithm SHA256).Hash.ToLower()
            $match = ($actual -eq $hash)
            if ($match) {
                Write-Host " MATCH" -ForegroundColor Green
                $pass++
            } else {
                Write-Host " MISMATCH" -ForegroundColor Red
                Write-Host "  Expected: $hash"
                Write-Host "  Actual:   $actual"
                $fail++
            }
            $results += [PSCustomObject]@{
                File = $rel
                Expected = $hash
                Actual = $actual
                Match = $match
            }
            $found = $true
            break
        }
    }
    if (-not $found) {
        Write-Host "MISSING: $($Expected[$hash][0])" -ForegroundColor Yellow
        $missing++
        $results += [PSCustomObject]@{
            File = $Expected[$hash][0]
            Expected = $hash
            Actual = "NOT_FOUND"
            Match = $false
        }
    }
}

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "PASS:    $pass"
Write-Host "FAIL:    $fail"
Write-Host "MISSING: $missing"
Write-Host "TOTAL:   $($Expected.Count)"

if ($fail -eq 0 -and $missing -eq 0 -and $pass -eq $Expected.Count) {
    Write-Host ""
    Write-Host "EXTERNAL_ARCHIVE_VALIDATED = TRUE" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "EXTERNAL_ARCHIVE_VALIDATED = FALSE" -ForegroundColor Red
    Write-Host "Do NOT delete VPS originals. Re-transfer failed/missing files."
    exit 1
}
