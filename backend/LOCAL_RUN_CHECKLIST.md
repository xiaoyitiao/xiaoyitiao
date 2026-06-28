# 智药伴后端本地运行排查清单

## 一、环境依赖检查

### 1.1 Java 版本检查

```bash
# 命令
java -version

# 预期输出（版本号需 >= 17）
openjdk version "17.0.x" 20xx-xx-xx LTS
```

### 1.2 Maven 版本检查

```bash
# 命令
mvn -v

# 预期输出（版本号需 >= 3.6）
Apache Maven 3.9.x (xxxxxxxx)
```

### 1.3 MySQL 服务检查

```bash
# 命令（Windows）
net start MySQL80

# 或检查端口
netstat -ano | findstr :3306

# 预期输出（端口3306被监听）
TCP    0.0.0.0:3306           0.0.0.0:0              LISTENING
```

### 1.4 依赖修复（必做）

**问题：** JPUSH 依赖 groupId 错误导致无法下载

**修复：** 修改 `backend/pom.xml` 第 120 行

```xml
<!-- 修改前（错误） -->
<groupId>cn.jpush</groupId>

<!-- 修改后（正确） -->
<groupId>cn.jpush.api</groupId>
```

### 1.5 编译检查（重要）

在运行测试前，建议先执行编译检查，提前发现问题：

```bash
mvn clean compile

# 预期输出（最后一行）
[INFO] BUILD SUCCESS
```

## 二、数据库配置

### 2.1 创建数据库

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE zhiyaoban CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2.2 导入测试数据

```bash
mysql -u root -p zhiyaoban < backend/scripts/import-test-data.sql
```

### 2.3 验证数据导入

```bash
mysql -u root -p zhiyaoban -e "SELECT COUNT(*) FROM users;"
# 预期输出：3
```

## 三、环境变量配置

### 3.1 复制配置文件

```bash
cd backend
copy .env.example .env
```

### 3.2 配置项说明

| 配置项 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| MYSQL_HOST | 是 | localhost | 数据库主机 |
| MYSQL_PORT | 是 | 3306 | 数据库端口 |
| MYSQL_DB | 是 | zhiyaoban | 数据库名 |
| MYSQL_USER | 是 | root | 数据库用户名 |
| MYSQL_PASSWORD | 是 | root | 数据库密码 |
| JWT_SECRET | 是 | - | JWT 密钥（生产环境必须修改） |
| SMS_MOCK | 否 | true | 是否启用短信模拟模式 |
| PUSH_PLATFORM | 否 | mock | 推送平台：mock/jpush/webpush |
| AI_ENABLED | 否 | false | 是否启用 AI 功能 |

### 3.3 开发环境推荐配置

```env
# .env 文件内容
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=zhiyaoban
MYSQL_USER=root
MYSQL_PASSWORD=root
JWT_SECRET=dev-secret-key-zhiyaoban-2024
SMS_MOCK=true
PUSH_PLATFORM=mock
AI_ENABLED=false
```

## 四、构建验证

### 4.1 清理构建

```bash
cd backend
mvn clean
```

### 4.2 编译项目

```bash
mvn compile

# 预期输出（最后一行）
[INFO] BUILD SUCCESS
```

### 4.3 运行单元测试

```bash
# 运行全部测试
mvn test

# 或运行特定测试
mvn test -Dtest=SmsPushServiceTest
mvn test -Dtest=AuthServiceTest
mvn test -Dtest=ReminderDeduplicationTest
mvn test -Dtest=ReminderLowStockTest
```

### 4.4 测试结果说明

| 测试类 | 测试用例数 | 验证内容 |
|--------|-----------|----------|
| SmsPushServiceTest | 11 | SMS/Push 配置检查、PushService 逻辑 |
| AuthServiceTest | 4 | 验证码发送逻辑（模拟/真实模式） |
| ReminderDeduplicationTest | 3 | 提醒去重逻辑 |
| ReminderLowStockTest | 3 | 库存不足提醒逻辑 |

## 五、启动应用

### 5.1 方式一：Maven 启动（推荐）

```bash
mvn spring-boot:run
```

### 5.2 方式二：打包后运行

```bash
mvn package
java -jar target/zhiyaoban-backend-1.0.0.jar
```

### 5.3 启动成功验证

```bash
# 检查服务是否启动（发送验证码接口，无需认证）
curl -X POST http://localhost:8080/api/auth/send-code -H "Content-Type: application/json" -d "{\"phone\":\"13800138001\"}"

# 预期输出（模拟模式）
{"code":200,"message":"验证码已发送","data":"123456"}
```

### 5.4 .env 文件加载说明

项目已集成 `spring-dotenv` 依赖，启动时会自动加载 `backend/.env` 文件中的环境变量。

**加载优先级：**
1. 系统环境变量（最高优先级）
2. `.env` 文件中的变量
3. `application.yml` 中的默认值（最低优先级）

## 六、API 端到端测试

### 6.1 导入 Postman 测试集合

文件路径：`backend/postman/Zhiyaoban_SMS_Push_Mock_Test.postman_collection.json`

### 6.2 测试流程

1. **发送验证码** → POST `/api/auth/sms`
   - 请求体：`{"phone": "13800138001"}`
   - 预期：返回成功，验证码为 `123456`（模拟模式）

2. **登录** → POST `/api/auth/login`
   - 请求体：`{"phone": "13800138001", "code": "123456"}`
   - 预期：返回 JWT Token

3. **获取用户信息** → GET `/api/users/me`
   - 请求头：`Authorization: Bearer <token>`
   - 预期：返回用户信息

4. **保存推送订阅** → POST `/api/users/subscription`
   - 请求头：`Authorization: Bearer <token>`
   - 请求体：`{"endpoint": "https://example.com/push", "p256dh": "...", "auth": "..."}`
   - 预期：返回成功

5. **手动触发推送测试** → POST `/api/users/push-test`
   - 请求头：`Authorization: Bearer <token>`
   - 请求体：`{"title": "测试推送", "content": "这是一条测试消息"}`
   - 预期：返回成功，查看服务端日志验证推送调用

### 6.3 测试账号

| 角色 | 手机号 | 验证码 |
|------|--------|--------|
| 老人1 | 13800138001 | 123456 |
| 老人2 | 13800138002 | 123456 |
| 家属1 | 13900139001 | 123456 |

## 七、常见问题排查

### 7.1 数据库连接失败

**错误信息：** `Unable to acquire JDBC Connection`

**解决方案：**
1. 确认 MySQL 服务已启动
2. 检查 `.env` 中的数据库配置是否正确
3. 确认数据库 `zhiyaoban` 已创建

### 7.2 短信发送失败（模拟模式）

**错误信息：** 验证码不是 `123456`

**解决方案：**
1. 确认 `SMS_MOCK=true`
2. 检查 `AuthService` 中模拟模式逻辑

### 7.3 推送失败

**错误信息：** PushService 返回 false

**解决方案：**
1. 确认 `PUSH_PLATFORM=mock`
2. 检查用户是否有推送订阅记录
3. 查看服务端日志 `PushService` 相关输出

### 7.4 H2 测试数据库问题

**错误信息：** 测试时表不存在

**解决方案：**
- 测试配置已使用 H2 内存数据库，无需额外配置
- 确保 `pom.xml` 中 H2 依赖 scope 为 `test`

### 7.5 JPush 依赖下载失败

**错误信息：** `The POM for cn.jpush:jpush-client:jar:3.6.6 is missing`

**解决方案：**
1. 确认已修复 `pom.xml` 中的 groupId 为 `cn.jpush.api`
2. 清理并重新构建：`mvn clean compile`

## 八、测试文件清单

| 文件路径 | 说明 |
|----------|------|
| `src/test/java/com/zhiyaoban/service/SmsPushServiceTest.java` | SMS/Push 逻辑测试 |
| `src/test/java/com/zhiyaoban/service/AuthServiceTest.java` | 验证码发送测试 |
| `src/test/java/com/zhiyaoban/service/ReminderDeduplicationTest.java` | 提醒去重测试 |
| `src/test/java/com/zhiyaoban/service/ReminderLowStockTest.java` | 库存提醒测试 |
| `src/test/resources/test-data-sms-push.sql` | 测试数据 |
| `postman/Zhiyaoban_SMS_Push_Mock_Test.postman_collection.json` | API 测试集合 |

## 九、生产环境部署前检查

- [ ] 修改 `JWT_SECRET` 为强密钥
- [ ] 设置 `SMS_MOCK=false` 并配置阿里云短信
- [ ] 设置 `PUSH_PLATFORM=jpush` 并配置极光推送
- [ ] 修改 CORS 配置为具体域名
- [ ] 配置 HTTPS
- [ ] 配置数据库连接池参数
- [ ] 配置日志输出路径
- [ ] 配置监控告警
