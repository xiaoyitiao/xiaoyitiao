$baseDir = "d:\lmc\zhiyaoban-app\backend\tools"
$javaUrl = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.19%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.19_7.zip"
$mavenUrl = "https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip"

$javaDest = "$baseDir\jdk17.zip"
$mavenDest = "$baseDir\maven.zip"
$javaInstall = "$baseDir\java"
$mavenInstall = "$baseDir\maven"

if (-not (Test-Path $baseDir)) { New-Item -ItemType Directory -Path $baseDir | Out-Null }

Write-Host "Downloading Java 17..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $javaUrl -OutFile $javaDest -UseBasicParsing
Write-Host "Java downloaded" -ForegroundColor Green

Write-Host "Downloading Maven..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $mavenUrl -OutFile $mavenDest -UseBasicParsing
Write-Host "Maven downloaded" -ForegroundColor Green

Write-Host "Extracting Java..." -ForegroundColor Yellow
if (-not (Test-Path $javaInstall)) { New-Item -ItemType Directory -Path $javaInstall | Out-Null }
Expand-Archive -Path $javaDest -DestinationPath $javaInstall -Force
$jdkDir = (Get-ChildItem -Path $javaInstall -Directory | Select-Object -First 1).FullName
Write-Host "Java extracted to: $jdkDir" -ForegroundColor Green

Write-Host "Extracting Maven..." -ForegroundColor Yellow
if (-not (Test-Path $mavenInstall)) { New-Item -ItemType Directory -Path $mavenInstall | Out-Null }
Expand-Archive -Path $mavenDest -DestinationPath $mavenInstall -Force
$mavenBin = "$mavenInstall\apache-maven-3.9.6\bin"
Write-Host "Maven extracted to: $mavenInstall" -ForegroundColor Green

Write-Host "" -ForegroundColor Cyan
Write-Host "=== Download Complete ===" -ForegroundColor Cyan
Write-Host "JAVA_HOME: $jdkDir" -ForegroundColor Yellow
Write-Host "MAVEN_HOME: $mavenInstall\apache-maven-3.9.6" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Cyan
Write-Host "Run the following commands:" -ForegroundColor Yellow
Write-Host "`$env:JAVA_HOME = `"$jdkDir`"" -ForegroundColor Cyan
Write-Host "`$env:MAVEN_HOME = `"$mavenInstall\apache-maven-3.9.6`"" -ForegroundColor Cyan
Write-Host "`$env:PATH = `"$jdkDir\bin;$mavenBin;`$env:PATH`"" -ForegroundColor Cyan
Write-Host "cd d:\lmc\zhiyaoban-app\backend" -ForegroundColor Cyan
Write-Host "mvn test -Dtest=ReminderDeduplicationTest#testTriggerReminderDeduplication" -ForegroundColor Cyan
