# 智药伴测试数据导入脚本
# 用于 SMS 和 Push 功能端到端测试

param(
    [string]$Host = "localhost",
    [int]$Port = 3306,
    [string]$Database = "zhiyaoban",
    [string]$User = "root",
    [string]$Password = "root"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlFile = Join-Path $scriptDir "import-test-data.sql"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "智药伴测试数据导入" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 SQL 文件是否存在
if (-not (Test-Path $sqlFile)) {
    Write-Host "[错误] SQL文件不存在: $sqlFile" -ForegroundColor Red
    exit 1
}

# 检查 MySQL 客户端
$mysqlCmd = Get-Command mysql -ErrorAction SilentlyContinue
if (-not $mysqlCmd) {
    Write-Host "[错误] 未找到 MySQL 客户端 (mysql 命令)" -ForegroundColor Red
    Write-Host "请确保 MySQL 已安装并配置在 PATH 中" -ForegroundColor Yellow
    exit 1
}

# 构建连接字符串
$connectionString = "-h$Host -P$Port -u$User"

if ($Password) {
    $connectionString += " -p$Password"
}

Write-Host "[信息] 连接到 MySQL: $Host`:$Port/$Database" -ForegroundColor Green

# 检查数据库是否存在
Write-Host "[信息] 检查数据库..." -ForegroundColor Yellow
$checkDbCmd = "mysql $connectionString -e `"SHOW DATABASES LIKE '$Database';"" 2>&1
$dbExists = Invoke-Expression $checkDbCmd

if ($dbExists -notmatch $Database) {
    Write-Host "[错误] 数据库 '$Database' 不存在" -ForegroundColor Red
    Write-Host "请先创建数据库：" -ForegroundColor Yellow
    Write-Host "  CREATE DATABASE $Database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" -ForegroundColor Cyan
    exit 1
}

# 执行 SQL 导入
Write-Host "[信息] 执行数据导入..." -ForegroundColor Yellow
$importCmd = "mysql $connectionString $Database" 2>&1

try {
    $result = Get-Content $sqlFile | Invoke-Expression $importCmd 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[成功] 数据导入完成！" -ForegroundColor Green
        Write-Host ""

        # 验证数据
        Write-Host "[验证] 检查导入数据..." -ForegroundColor Yellow
        $verifyCmd = "mysql $connectionString $Database -e `"SELECT '用户' AS type, COUNT(*) AS count FROM users WHERE id IN (1001,1002,2001) UNION ALL SELECT '药品', COUNT(*) FROM medicines WHERE user_id IN (1001,1002) UNION ALL SELECT '推送订阅', COUNT(*) FROM push_subscriptions WHERE user_id IN (1001,1002) UNION ALL SELECT '提醒计划', COUNT(*) FROM reminder_schedules WHERE user_id IN (1001,1002);"" 2>&1"
        Invoke-Expression $verifyCmd

    } else {
        Write-Host "[错误] 数据导入失败" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[错误] 执行出错: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "数据导入完成，可进行 API 测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "测试账号：" -ForegroundColor White
Write-Host "  老人1: 13800138001 (密码: 123456 演示模式)" -ForegroundColor Gray
Write-Host "  老人2: 13800138002 (密码: 123456 演示模式)" -ForegroundColor Gray
Write-Host "  家属1: 13900139001 (密码: 123456 演示模式)" -ForegroundColor Gray
