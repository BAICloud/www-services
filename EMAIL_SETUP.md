# 邮件服务配置指南

为了让验证码真正发送到用户的 Aalto 邮箱，你需要配置邮件服务。

## 方式 1: SendGrid (推荐) ⭐

SendGrid 提供免费的邮件发送服务（每天 100 封邮件），非常适合开发和生产环境。

### 步骤：

1. **注册 SendGrid 账号**
   - 访问 https://sendgrid.com
   - 注册免费账号

2. **创建 API Key**
   - 登录后，进入 Settings → API Keys
   - 点击 "Create API Key"
   - 选择 "Full Access" 或 "Restricted Access" (Mail Send)
   - 保存 API Key（只会显示一次）

3. **验证发件人邮箱**（可选但推荐）
   - 进入 Settings → Sender Authentication
   - 验证你的发件人邮箱地址

4. **配置环境变量**
   
   在 `project.env` 文件中添加：
   ```env
   SENDGRID_API_KEY=SG.your_api_key_here
   SENDGRID_FROM_EMAIL=noreply@handygo.com
   SENDGRID_FROM_NAME=HandyGO
   ```

5. **重启服务**
   ```bash
   docker compose restart server
   ```

## 方式 2: Gmail SMTP

如果你想使用 Gmail 发送邮件，需要：

### 步骤：

1. **创建 Gmail 应用密码**
   - 登录 Google 账号
   - 进入 https://myaccount.google.com/apppasswords
   - 选择 "Mail" 和你的设备
   - 生成应用密码（16 位字符）

2. **配置环境变量**
   
   在 `project.env` 文件中添加：
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-digit-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   ```

3. **重启服务**
   ```bash
   docker compose restart server
   ```

⚠️ **注意**：Gmail 的应用密码不是你的 Gmail 密码，而是专门为应用生成的 16 位密码。

## 方式 3: Aalto 邮箱 SMTP (如果可用)

如果你有 Aalto 邮箱的 SMTP 访问权限：

```env
SMTP_HOST=smtp.aalto.fi
SMTP_PORT=587
SMTP_USER=your-aalto-email@aalto.fi
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=your-aalto-email@aalto.fi
```

## 测试邮件发送

配置完成后，测试邮件发送：

1. 访问注册页面：http://localhost:5173/register
2. 输入 Aalto 邮箱
3. 点击 "Send Code"
4. 检查服务器日志：
   ```bash
   docker compose logs server | grep "Email"
   ```
5. 检查邮箱收件箱（包括垃圾邮件文件夹）

## 故障排查

### 邮件没有收到

1. **检查服务器日志**
   ```bash
   docker compose logs server | grep -i "email\|verification"
   ```

2. **检查垃圾邮件文件夹**
   - 验证码邮件可能被标记为垃圾邮件

3. **检查配置**
   - 确认环境变量已正确设置
   - 确认已重启服务器

4. **SendGrid 问题**
   - 检查 SendGrid 账号状态
   - 确认 API Key 权限
   - 检查 SendGrid 控制台的发送日志

5. **Gmail SMTP 问题**
   - 确认使用的是应用密码，不是普通密码
   - 确认已启用"允许不够安全的应用"
   - 检查 Gmail 账号是否启用了 2FA（两步验证）

## 开发模式

如果没有配置邮件服务，系统会自动进入开发模式：
- 验证码会显示在页面上（绿色提示消息）
- 验证码会打印在服务器日志中
- 不会发送实际邮件

这样可以在开发时测试功能，而不需要配置邮件服务。

