Write-Host "=== Java & Maven Installation ===" -ForegroundColor Cyan

function Test-Command {
    param($Cmd)
    try {
        Get-Command $Cmd -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

$javaInstalled = Test-Command "java"
$mavenInstalled = Test-Command "mvn"

if (-not $javaInstalled) {
    Write-Host "Installing Java..." -ForegroundColor Yellow
    winget install Microsoft.OpenJDK.17 --accept-package-agreements --accept-source-agreements --silent
}

if (-not $mavenInstalled) {
    Write-Host "Installing Maven..." -ForegroundColor Yellow
    winget install Apache.Maven --accept-package-agreements --accept-source-agreements --silent
}

Write-Host "Refreshing environment..." -ForegroundColor Yellow
$env:PATH = [Environment]::GetEnvironmentVariable("PATH", "Machine")
$env:JAVA_HOME = [Environment]::GetEnvironmentVariable("JAVA_HOME", "Machine")
$env:MAVEN_HOME = [Environment]::GetEnvironmentVariable("MAVEN_HOME", "Machine")

Write-Host ""
Write-Host "=== Verification ===" -ForegroundColor Cyan

if (Test-Command "java") {
    Write-Host "Java: OK" -ForegroundColor Green
} else {
    Write-Host "Java: FAILED" -ForegroundColor Red
}

if (Test-Command "mvn") {
    Write-Host "Maven: OK" -ForegroundColor Green
} else {
    Write-Host "Maven: FAILED" -ForegroundColor Red
}

Write-Host ""
Write-Host "Run: mvn test -Dtest=ReminderDeduplicationTest#testTriggerReminderDeduplication" -ForegroundColor Yellow
