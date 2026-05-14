export const SIGNIN_STATUS = {
  // ✅ 成功类（200xx）
  SUCCESS: 20000,                              // 登录成功
  REQUIRE_TWO_FACTOR: 20001,                   // 需要两步验证
  REQUIRE_APPLICATION_AUTH: 20002,             // 需要授权应用

  // ❌ 参数错误（1000x）
  ERROR_MISSING_LOGIN_METHOD: 10001,           // 登录方式不能为空
  ERROR_MISSING_ACCOUNT: 10002,                // 账号不能为空
  ERROR_MISSING_PASSWORD: 10003,               // 密码不能为空
  ERROR_MISSING_VERIFICATION_CODE: 10004,      // 验证码不能为空
  ERROR_MISSING_CLIENT_KEY: 10005,            // 应用client_key不能为空
  ERROR_MISSING_REDIRECT_URI: 10006,           // 回调uri不能为空
  ERROR_MISSING_SCOPE: 10007,                  // SCOPE不能为空
  ERROR_INVALID_ACCOUNT: 10008,                   // 账号格式错误 
  ERROR_MISSING_CODE: 10009,                  // 密码格式错误

  // ❌ 应用相关（1001x）
  ERROR_APPLICATION_NOT_FOUND: 10010,          // 应用不存在
  ERROR_APPLICATION_DISABLED: 10011,           // 应用已停用
  ERROR_APPLICATION_BANNED: 10012,             // 应用已封禁
  ERROR_INVALID_CALLBACK_DOMAIN: 10013,        // 回调域名不合法
  ERROR_INVALID_SCOPE: 10014,                  // SCOPE不合法
  ERROR_APPLICATION_HAS_BEEN_AUTHORIZED: 10015,         // 应用已被授权

  // ❌ 账号状态（1002x）
  ERROR_ACCOUNT_NOT_FOUND: 10020,              // 账号不存在
  ERROR_PASSWORD_INCORRECT: 10021,             // 密码错误
  ERROR_ACCOUNT_BANNED: 10022,                 // 账号被封禁
  ERROR_ACCOUNT_FROZEN: 10023,                 // 账号被冻结
  ERROR_ACCOUNT_PENDING_DELETION: 10024,       // 注销冷静期中
  ERROR_TRY_TOO_MANY_TIMES: 10025,             // 尝试登录次数过多 请5分钟后再试
  ERROR_SESSION_CREATE: 10026,                // 会话创建失败
  ERROR_TOKEN_HAS_EXPIRED: 10027,               // token已过期
  
  // ❌ 验证码（1003x）
  ERROR_VERIFICATION_CODE_INVALID: 10030,      // 验证码无效或过期
  ERROR_TWOFACTOR_INVALID: 10031,               // 两步验证验证码错误
  ERROR_CAPTCHA_FAIL: 10032,                      // 滑块验证失败

  // ❌ 系统级错误（Redis/数据库）（1004x）
  ERROR_REDIS_FAILURE: 10040,                  // Redis 操作失败
  ERROR_DATABASE_FAILURE: 10041,               // 数据库操作失败


}