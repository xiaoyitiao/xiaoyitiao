$baseUrl = "http://localhost:8080/api"
$phone = "13800001001"
$code = "123456"
$headers = @{}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "    库存不足提醒去重测试脚本" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

function Test-Connection {
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/user/profile" -Method GET -UseBasicParsing -TimeoutSec 5
        return $true
    } catch {
        return $false
    }
}

Write-Host "1. 检查服务连接..." -ForegroundColor Yellow
if (-not (Test-Connection)) {
    Write-Host "   ❌ 服务未启动，请先运行 mvn spring-boot:run" -ForegroundColor Red
    Write-Host ""
    Write-Host "   启动命令:" -ForegroundColor Yellow
    Write-Host "   cd d:\lmc\zhiyaoban-app\backend" -ForegroundColor Cyan
    Write-Host "   mvn spring-boot:run" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}
Write-Host "   ✅ 服务连接正常" -ForegroundColor Green

Write-Host ""
Write-Host "2. 登录获取 Token..." -ForegroundColor Yellow
try {
    $loginBody = @{
        phone = $phone
        code = $code
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    $token = $result.data.token
    $userId = $result.data.user.id
    
    $headers.Authorization = "Bearer $token"
    Write-Host "   ✅ 登录成功" -ForegroundColor Green
    Write-Host "   用户ID: $userId" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ 登录失败: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "3. 创建库存不足的药品..." -ForegroundColor Yellow
try {
    $medicineBody = @{
        name = "硝苯地平控释片"
        dose = "30mg"
        time = "08:00"
        frequency = "DAILY"
        stock = 2
        icon = "💊"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/medicines" -Method POST -Body $medicineBody -ContentType "application/json" -Headers $headers -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    $medicineId = $result.data.id
    
    Write-Host "   ✅ 药品创建成功" -ForegroundColor Green
    Write-Host "   药品ID: $medicineId" -ForegroundColor Cyan
    Write-Host "   药品名称: 硝苯地平控释片" -ForegroundColor Cyan
    Write-Host "   库存: 2 (低于阈值5)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ 药品创建失败: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "4. 创建库存提醒计划..." -ForegroundColor Yellow
try {
    $scheduleBody = @{
        name = "库存不足提醒测试"
        type = "STOCK"
        enabled = $true
        channel = "PUSH"
        medicineItems = @(
            @{
                medicineId = $medicineId
                remindTime = "09:00"
            }
        )
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/reminders/schedules" -Method POST -Body $scheduleBody -ContentType "application/json" -Headers $headers -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    $scheduleId = $result.data.id
    
    Write-Host "   ✅ 提醒计划创建成功" -ForegroundColor Green
    Write-Host "   计划ID: $scheduleId" -ForegroundColor Cyan
    Write-Host "   计划类型: STOCK" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ 计划创建失败: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "5. 连续5次触发库存提醒..." -ForegroundColor Yellow
Write-Host "   ==========================================" -ForegroundColor Yellow

$successCount = 0
$skipCount = 0

for ($i = 1; $i -le 5; $i++) {
    Write-Host ""
    Write-Host "   第 $i 次调用..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/reminders/schedules/$scheduleId/trigger?medicineId=$medicineId" -Method POST -Headers $headers -UseBasicParsing
        $result = $response.Content | ConvertFrom-Json
        
        Write-Host "   状态码: $($response.StatusCode)" -ForegroundColor Cyan
        Write-Host "   响应: $($result.message)" -ForegroundColor Cyan

        if ($result.message -match "已发送") {
            $successCount++
            Write-Host "   ✅ 提醒发送成功" -ForegroundColor Green
        } elseif ($result.message -match "跳过") {
            $skipCount++
            Write-Host "   ✅ 提醒已跳过（去重逻辑生效）" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ❌ 调用失败: $_" -ForegroundColor Red
    }

    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "   ==========================================" -ForegroundColor Yellow
Write-Host "   统计结果:" -ForegroundColor Yellow
Write-Host "   发送成功次数: $successCount" -ForegroundColor Cyan
Write-Host "   跳过次数: $skipCount" -ForegroundColor Cyan

Write-Host ""
Write-Host "6. 查询提醒日志..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/reminders/logs?userId=$userId" -Method GET -Headers $headers -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    $logs = $result.data
    
    Write-Host "   ✅ 查询成功" -ForegroundColor Green
    Write-Host "   总日志数: $($logs.Count)" -ForegroundColor Cyan
    
    $stockLogs = $logs | Where-Object { $_.type -eq "STOCK" }
    Write-Host "   库存提醒日志数: $($stockLogs.Count)" -ForegroundColor Cyan
    
    foreach ($log in $stockLogs) {
        Write-Host "   - 药品ID: $($log.medicineId), 状态: $($log.status), 时间: $($log.sentAt)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ❌ 查询日志失败: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "    测试结果验证" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if ($successCount -eq 1 -and $skipCount -eq 4) {
    Write-Host "   ✅✅✅ 去重测试完全通过！" -ForegroundColor Green
    Write-Host ""
    Write-Host "   验证项:" -ForegroundColor Yellow
    Write-Host "   ✓ 连续触发5次" -ForegroundColor Green
    Write-Host "   ✓ 第1次发送成功" -ForegroundColor Green
    Write-Host "   ✓ 第2-5次跳过（去重生效）" -ForegroundColor Green
    Write-Host "   ✓ 预期日志数: 1" -ForegroundColor Green
} else {
    Write-Host "   ❌❌❌ 去重测试未通过！" -ForegroundColor Red
    Write-Host ""
    Write-Host "   预期: 发送1次, 跳过4次" -ForegroundColor Yellow
    Write-Host "   实际: 发送$successCount次, 跳过$skipCount次" -ForegroundColor Red
}

Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
