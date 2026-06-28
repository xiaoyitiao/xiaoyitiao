# 智药伴 API 接口文档

## 基础信息

- **Base URL**: `/api`
- **认证方式**: JWT Bearer Token
- **通用请求头**: `Authorization: Bearer <token>`
- **通用响应格式**:
```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未登录或Token无效 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
| 503 | 服务不可用 |

---

## 一、认证接口 `/auth`

### 1.1 发送验证码
```
POST /auth/send-code
Content-Type: application/json

{
  "phone": "13800138000"
}
```

### 1.2 登录
```
POST /auth/login
Content-Type: application/json

{
  "phone": "13800138000",
  "code": "123456"
}

响应:
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "phone": "13800138000",
    "role": "ELDER",
    "userId": 1,
    "expiresIn": 604800
  }
}
```

---

## 二、用户接口 `/user`

### 2.1 获取当前用户信息
```
GET /user/me
Authorization: Bearer <token>

响应:
{
  "code": 200,
  "data": {
    "userId": 1,
    "phone": "13800138000",
    "name": "张三",
    "role": "ELDER",
    "createdAt": "2024-01-01T10:00:00"
  }
}
```

### 2.2 更新用户信息
```
PUT /user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "新名称"
}
```

### 2.3 刷新Token
```
POST /user/refresh-token
Authorization: Bearer <token>

响应:
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "expiresIn": 604800
  }
}
```

### 2.4 获取用户统计
```
GET /user/statistics
Authorization: Bearer <token>

响应:
{
  "code": 200,
  "data": {
    "medicineCount": 5,
    "todayCheckInCount": 3,
    "lowStockCount": 1
  }
}
```

### 2.5 搜索用户
```
GET /user/search?keyword=张三
Authorization: Bearer <token>
```

---

## 三、药品接口 `/medicines`

### 3.1 获取药品列表
```
GET /medicines
Authorization: Bearer <token>

响应:
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "name": "阿司匹林",
      "dose": "100mg",
      "time": "08:00",
      "frequency": "DAILY",
      "stock": 30,
      "icon": "💊"
    }
  ]
}
```

### 3.2 获取单个药品
```
GET /medicines/{id}
Authorization: Bearer <token>
```

### 3.3 创建药品
```
POST /medicines
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "阿司匹林",
  "dose": "100mg",
  "time": "08:00",
  "frequency": "DAILY",
  "weekDays": "1,2,3,4,5",
  "intervalDays": 1,
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "stock": 30,
  "note": "饭后服用",
  "icon": "💊"
}
```

### 3.4 更新药品
```
PUT /medicines/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "阿司匹林（肠溶）",
  "dose": "100mg",
  "time": "08:00",
  "frequency": "DAILY",
  "stock": 25
}
```

### 3.5 删除药品
```
DELETE /medicines/{id}
Authorization: Bearer <token>
```

### 3.6 批量删除药品
```
DELETE /medicines/batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "ids": [1, 2, 3]
}
```

### 3.7 搜索药品
```
GET /medicines/search?keyword=阿司匹林
Authorization: Bearer <token>
```

### 3.8 按频率筛选
```
GET /medicines/filter?frequency=DAILY
Authorization: Bearer <token>
```

### 3.9 获取库存不足药品
```
GET /medicines/low-stock?threshold=10
Authorization: Bearer <token>
```

### 3.10 更新库存
```
PUT /medicines/{id}/stock
Authorization: Bearer <token>
Content-Type: application/json

{
  "stock": 50
}
```

### 3.11 增加库存
```
POST /medicines/{id}/stock/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 10
}
```

---

## 四、打卡接口 `/check-ins`

### 4.1 用药打卡
```
POST /check-ins
Authorization: Bearer <token>
Content-Type: application/json

{
  "medicineId": 1,
  "date": "2024-01-15",
  "dose": "100mg"
}
```

### 4.2 取消打卡
```
DELETE /check-ins?medicineId=1&date=2024-01-15
Authorization: Bearer <token>
```

### 4.3 获取打卡记录
```
GET /check-ins?date=2024-01-15
Authorization: Bearer <token>
```

### 4.4 获取月份打卡记录
```
GET /check-ins/month?month=2024-01
Authorization: Bearer <token>
```

### 4.5 获取打卡统计
```
GET /check-ins/statistics?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>

响应:
{
  "code": 200,
  "data": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "totalCount": 150,
    "completedCount": 120,
    "checkIns": [...]
  }
}
```

### 4.6 获取今日打卡汇总
```
GET /check-ins/today-summary
Authorization: Bearer <token>

响应:
{
  "code": 200,
  "data": {
    "date": "2024-01-15",
    "totalMedicines": 5,
    "completedCount": 3,
    "pendingCount": 2,
    "checkIns": [...]
  }
}
```

### 4.7 批量打卡
```
POST /check-ins/batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {"medicineId": 1},
    {"medicineId": 2}
  ]
}
```

---

## 五、家人绑定接口 `/family`

### 5.1 绑定老人和家属
```
POST /family/bind
Authorization: Bearer <token>
Content-Type: application/json

{
  "elderUserId": 1,
  "relation": "子女"
}
```

### 5.2 解除绑定
```
DELETE /family/unbind/{bindingId}
Authorization: Bearer <token>
```

### 5.3 获取我绑定的老人（家属角色）
```
GET /family/my-elders
Authorization: Bearer <token>
```

### 5.4 获取绑定我的家属（老人角色）
```
GET /family/my-families
Authorization: Bearer <token>
```

### 5.5 获取绑定关系详情
```
GET /family/bindings
Authorization: Bearer <token>
```

### 5.6 查看老人今日用药（家属查看老人）
```
GET /family/elder-today/{elderUserId}
Authorization: Bearer <token>
```

### 5.7 查看老人指定日期用药
```
GET /family/elder-date/{elderUserId}?date=2024-01-15
Authorization: Bearer <token>
```

### 5.8 检查查看权限
```
GET /family/can-view/{elderUserId}
Authorization: Bearer <token>

响应:
{
  "code": 200,
  "data": {
    "canView": true
  }
}
```

---

## 六、日程接口 `/schedule`

### 6.1 获取今日计划
```
GET /schedule/today?date=2024-01-15
Authorization: Bearer <token>

响应:
{
  "code": 200,
  "data": {
    "date": "2024-01-15",
    "medicines": [...],
    "checkIns": [...],
    "totalCount": 5,
    "completedCount": 3,
    "pendingCount": 2,
    "completionRate": 60
  }
}
```

### 6.2 获取本周计划
```
GET /schedule/week?startDate=2024-01-15
Authorization: Bearer <token>
```

### 6.3 获取日期范围计划
```
GET /schedule/range?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

---

## 七、提醒订阅接口 `/reminders`

### 7.1 订阅推送
```
POST /reminders/subscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/...",
  "p256dh": "xxx",
  "auth": "xxx"
}
```

### 7.2 取消订阅
```
DELETE /reminders/unsubscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/..."
}
```

### 7.3 获取订阅列表
```
GET /reminders/subscriptions
Authorization: Bearer <token>
```

### 7.4 测试推送
```
POST /reminders/test-push
Authorization: Bearer <token>
```

### 7.5 获取订阅状态
```
GET /reminders/status
Authorization: Bearer <token>

响应:
{
  "code": 200,
  "data": {
    "hasSubscription": true,
    "subscriptionCount": 1
  }
}
```

---

## 八、AI接口 `/ai`

### 8.1 AI对话
```
POST /ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "今天感觉头疼，应该怎么办？",
  "systemPrompt": "你是一个医疗助手..."
}
```

### 8.2 AI解析
```
POST /ai/parse
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "阿司匹林 100mg 每日一次",
  "systemPrompt": "请解析药品信息..."
}
```

### 8.3 获取AI状态
```
GET /ai/status
Authorization: Bearer <token>

响应:
{
  "code": 200,
  "data": {
    "enabled": true,
    "model": "gpt-3.5-turbo"
  }
}
```

---

## 九、报告接口 `/reports`

### 9.1 生成报告
```
POST /reports/generate
Authorization: Bearer <token>
```

### 9.2 获取报告状态
```
GET /reports/status
Authorization: Bearer <token>
```

---

## 枚举值说明

### 用户角色 (UserRole)
- `ELDER`: 老人
- `FAMILY`: 家属
- `ADMIN`: 管理员

### 药品频率 (MedicineFrequency)
- `DAILY`: 每天
- `WEEKLY`: 每周
- `ONCE`: 一次性
- `INTERVAL`: 间隔天数
- `CUSTOM`: 自定义

### 绑定状态 (BindingStatus)
- `PENDING`: 待确认
- `ACTIVE`: 已激活
- `INACTIVE`: 已停用
- `ACCEPTED`: 已同意
- `REJECTED`: 已拒绝

### 提醒类型 (ReminderType)
- `DUE`: 到点提醒
- `MISSED`: 漏服提醒
- `MEDICINE`: 用药提醒

### 提醒渠道 (ReminderChannel)
- `PUSH`: Web Push
- `SMS`: 短信
- `CALL`: 电话
- `IN_APP`: 应用内

### 提醒状态 (ReminderStatus)
- `PENDING`: 待发送
- `SENT`: 已发送
- `SUCCESS`: 发送成功
- `FAILED`: 发送失败

---

## 测试建议

1. **认证测试**: 先调用 `/auth/send-code` 获取验证码，再调用 `/auth/login` 获取Token
2. **药品测试**: 创建药品后，测试CRUD完整流程
3. **打卡测试**: 药品创建后再进行打卡操作
4. **家人绑定**: 需要创建两个用户，一个是老人，一个是家属
5. **统计测试**: 创建多个打卡记录后测试统计接口
