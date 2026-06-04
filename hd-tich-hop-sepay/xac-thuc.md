# Xác thực webhook SePay thế nào?

## So sánh 4 cách xác thực webhook SePay (HMAC-SHA256, API Key, OAuth 2.0, không xác thực) kèm code mẫu đầy đủ trong PHP, Node.js và Python.

SePay hỗ trợ 4 cách xác thực. Bạn chọn cách lúc tạo webhook và có thể đổi lại bất cứ lúc nào.

| Cách                              | Bảo mật    | Độ khó     | Khi nào dùng                                                         |
| --------------------------------- | ---------- | ---------- | -------------------------------------------------------------------- |
| [Không xác thực](#khong-xac-thuc) | Thấp       | Dễ         | Chỉ test, không dùng production                                      |
| [API Key](#api-key)               | Trung bình | Dễ         | Yêu cầu xác thực cơ bản                                              |
| [HMAC-SHA256](#hmac-sha256)       | Cao        | Trung bình | **Khuyến nghị.** Phát hiện ngay nếu payload bị sửa giữa đường truyền |
| [OAuth 2.0](#oauth-20)            | Cao        | Cao        | Hệ thống đã có OAuth server sẵn                                      |

## Không xác thực

Không có bước xác thực nào. SePay gửi thẳng webhook đến URL của bạn, không kèm header bảo mật, và server của bạn không có cách nào kiểm tra request có thực sự đến từ SePay hay không.

Chỉ nên dùng khi test trong môi trường nội bộ. Không bao giờ dùng cho production, vì bất kỳ ai biết URL đều có thể gửi request giả mạo đến endpoint của bạn.

## API Key

SePay gửi kèm header `Authorization`, server bạn so sánh với giá trị đã cấu hình.

### Header

```
Authorization: Apikey YOUR_API_KEY
```

### Code kiểm tra

<!-- No code tabs available -->

### Cấu hình

Chọn **API Key** ở bước Bảo mật khi tạo webhook, nhập key rồi lưu vào biến môi trường trên server.

<Image src="/images/webhooks/wizard-apikey-config.png" alt="Cấu hình API Key" caption="Cấu hình API Key khi tạo webhook" />

<Callout type="warn" title="API Key chỉ hiện đầy đủ một lần">
Sau khi lưu, mở lại chỉ thấy 4 ký tự cuối (
`****xxxx`
). SePay không lưu bản rõ. Copy vào biến môi trường ngay khi tạo. Quên hoặc nghi bị lộ thì tạo API Key mới.
</Callout>

<Callout type="info">
API Key chỉ xác minh request đến từ SePay, nhưng không bảo vệ payload nếu có ai chen ngang sửa đổi giữa đường truyền. Cần bảo mật hơn thì dùng 
HMAC-SHA256
.
</Callout>

## HMAC-SHA256

Cách xác thực an toàn nhất. SePay ký từng request bằng chữ ký số rồi gửi kèm trong header. Server của bạn tái tạo chữ ký theo cùng công thức rồi so sánh để xác minh request là thật.

### Headers SePay gửi

<ParamsTable
  rows={[
{ "name": "X-SePay-Signature", "type": "string", "description": "Chữ ký, định dạng <code>sha256={hex_hash}</code>" },
{ "name": "X-SePay-Timestamp", "type": "string", "description": "Unix timestamp (giây) lúc ký" }
]}
/>

### Cách SePay ký

1. Lấy timestamp hiện tại (Unix seconds)
2. Ghép chuỗi: `{timestamp}.{raw_body}`
3. Tính HMAC-SHA256 với Secret Key
4. Gửi header `X-SePay-Signature: sha256={hex_hash}`
5. Gửi header `X-SePay-Timestamp: {timestamp}`

<Callout type="warn" title="Dùng raw body, không dùng body đã parse">
SePay ký bytes gốc của body. Nếu middleware (
`express.json()`
, Fastify default...) đã parse rồi bạn 
`JSON.stringify(req.body)`
 lại thì chữ ký sẽ lệch vì:
PHP escape Unicode thành 
`\uXXXX`
, JavaScript thì không
Thứ tự khóa JSON có thể đổi
Khoảng trắng có thể khác
Cách đọc raw body: Node.js 
`express.raw({ type: 'application/json' })`
, PHP 
`file_get_contents('php://input')`
, Python 
`request.get_data(as_text=True)`
.
</Callout>

<Callout type="info" title="Webhook dùng form-encoded body">
Nếu webhook cấu hình 
`application/x-www-form-urlencoded`
 hoặc 
`multipart/form-data`
, SePay ký chuỗi form-encoded (giống 
`http_build_query`
 của PHP). Vẫn dùng raw body.
</Callout>

### Code kiểm tra chữ ký

<!-- No code tabs available -->

### Cấu hình

1. Tạo/sửa webhook, chọn **HMAC-SHA256** ở bước Bảo mật
2. Nhập Secret Key hoặc bấm nút tạo tự động
3. Lưu Secret Key vào biến môi trường trên server (`SEPAY_WEBHOOK_SECRET`)

<Image src="/images/webhooks/wizard-hmac-config.png" alt="Cấu hình HMAC-SHA256" caption="Cấu hình HMAC-SHA256 khi tạo webhook" />

<Callout type="warn" title="Bảo quản Secret Key">
Sau khi lưu, mở lại chỉ thấy 4 ký tự cuối (
`****xxxx`
) — SePay không lưu bản rõ. Copy vào biến môi trường ngay khi tạo, không commit vào source code, không gửi qua email/chat. Quên hoặc nghi bị lộ thì tạo Secret Key mới.
</Callout>

### Lỗi thường gặp

| Vấn đề            | Nguyên nhân                             | Cách sửa                             |
| ----------------- | --------------------------------------- | ------------------------------------ |
| Chữ ký không khớp | Middleware parse body rồi serialize lại | Dùng raw body gốc                    |
| Chữ ký không khớp | Sai Secret Key                          | Kiểm tra biến môi trường             |
| Chữ ký không khớp | Thiếu timestamp trong chuỗi ký          | Đúng format: `{timestamp}.{body}`    |
| Timestamp quá cũ  | Đồng hồ server lệch                     | Bật NTP để đồng bộ thời gian tự động |

## OAuth 2.0

Cách hoạt động: SePay gọi token endpoint của bạn để lấy access token, sau đó gửi webhook kèm header `Authorization: Bearer {access_token}`. Khi token sắp hết hạn, SePay tự refresh hoặc xin token mới.

<Image src="/images/webhooks/wizard-oauth2-config.png" alt="Cấu hình OAuth 2.0" caption="Cấu hình OAuth 2.0 khi tạo webhook" />

### Hai định dạng hỗ trợ

|              | Dạng chuẩn                                    | Dạng tùy chỉnh                                        |
| ------------ | --------------------------------------------- | ----------------------------------------------------- |
| **Request**  | `application/x-www-form-urlencoded`           | `application/json`                                    |
| **Body**     | `grant_type=client_credentials`               | `{"clientId": "...", "clientSecret": "..."}`          |
| **Response** | `{"access_token": "...", "expires_in": 3600}` | `{"data": {"accessToken": "...", "expiredIn": 3600}}` |

Khi xin token, SePay thử dạng chuẩn trước. Phản hồi không đúng format thì tự chuyển sang dạng tùy chỉnh. Tích hợp mới nên dùng dạng chuẩn; hệ thống đang chạy ổn dạng tùy chỉnh thì cứ để nguyên.

### Dạng chuẩn

OAuth 2.0 client credentials. Hầu hết framework đều hỗ trợ sẵn. SePay gửi request tới token endpoint của bạn:

<!-- No code tabs available -->

Tham số body (`application/x-www-form-urlencoded`):

<ParamsTable
  rows={[
{ "name": "grant_type", "type": "string", "required": true, "description": "Luôn là <code>client_credentials</code>" },
{ "name": "client_id", "type": "string", "required": true, "description": "Client ID đã cấu hình trên Webhooks" },
{ "name": "client_secret", "type": "string", "required": true, "description": "Client Secret đã cấu hình trên Webhooks" }
]}
/>

Response:

<Response title="RESPONSE">
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "dGhpcyBpcyBh..."
}
```
</Response>

<ParamsTable
  rows={[
{ "name": "access_token", "type": "string", "required": true, "description": "Token SePay dùng ở header <code>Authorization: Bearer {access_token}</code>" },
{ "name": "expires_in", "type": "integer", "required": false, "description": "Thời gian hết hạn (giây). Mặc định 3600 nếu không trả" },
{ "name": "refresh_token", "type": "string", "required": false, "description": "Refresh token. Không có thì SePay xin token mới từ đầu" }
]}
/>

Code mẫu server endpoint:

<CodeTabs>
  <Code label="PHP">
    ```php
    <?php
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $grantType = $_POST['grant_type'] ?? '';
    
    if ($grantType !== 'client_credentials') {
        http_response_code(400);
        echo json_encode(['error' => 'unsupported_grant_type']);
        exit;
    }
    
    $expected = 'Basic ' . base64_encode(getenv('CLIENT_ID') . ':' . getenv('CLIENT_SECRET'));
    if (!hash_equals($expected, $auth)) {
        http_response_code(401);
        echo json_encode(['error' => 'invalid_client']);
        exit;
    }
    
    echo json_encode([
        'access_token' => bin2hex(random_bytes(32)),
        'token_type'   => 'Bearer',
        'expires_in'   => 3600,
    ]);
    ```
  </Code>
  <Code label="Node.js">
    ```js
    import crypto from 'node:crypto';
    
    app.post('/oauth/token', (req, res) => {
      const { grant_type, client_id, client_secret } = req.body;
    
      if (grant_type !== 'client_credentials') {
        return res.status(400).json({ error: 'unsupported_grant_type' });
      }
    
      if (client_id !== process.env.CLIENT_ID || client_secret !== process.env.CLIENT_SECRET) {
        return res.status(401).json({ error: 'invalid_client' });
      }
    
      res.json({
        access_token: crypto.randomBytes(32).toString('hex'),
        token_type: 'Bearer',
        expires_in: 3600,
      });
    });
    ```
  </Code>
</CodeTabs>

### Dạng tùy chỉnh

Tương thích ngược cho hệ thống đã tích hợp trước. Không cần chuyển nếu đang chạy ổn. SePay gửi request tới token endpoint của bạn:

<!-- No code tabs available -->

Tham số body (`application/json`):

<ParamsTable
  rows={[
{ "name": "clientId", "type": "string", "required": true, "description": "Client ID đã cấu hình trên Webhooks" },
{ "name": "clientSecret", "type": "string", "required": true, "description": "Client Secret đã cấu hình trên Webhooks" }
]}
/>

Response:

<Response title="RESPONSE">
```json
{
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiredIn": 3600
  }
}
```
</Response>

<ParamsTable
  rows={[
{ "name": "data.accessToken", "type": "string", "required": true, "description": "Access token" },
{ "name": "data.refreshToken", "type": "string", "required": true, "description": "Refresh token" },
{ "name": "data.expiredIn", "type": "integer", "required": true, "description": "Thời gian hết hạn (giây)" }
]}
/>

### Refresh Token

Token còn dưới 10 giây thì SePay refresh. Refresh thất bại thì xin token mới từ đầu.

**Dạng chuẩn**: `grant_type=refresh_token` + `refresh_token` dạng form-urlencoded.

**Dạng tùy chỉnh**: JSON `{"clientId": "...", "clientSecret": "...", "refreshToken": "..."}`.

SePay thử dạng chuẩn trước, lỗi thì chuyển sang dạng tùy chỉnh.

### Gửi webhook

Có token rồi, SePay gửi:

```http
POST https://your-webhook-url
Authorization: Bearer eyJhbGci...
Content-Type: application/json
```

Endpoint trả 200/201 kèm `{"success": true}` là thành công. Mọi kết quả khác đều bị tính là thất bại.

### Lưu ý

* Token endpoint phải HTTPS
* Token endpoint lỗi thì retry theo cùng lịch webhook delivery, xem [Xử lý lỗi](./xu-ly-loi)
* Bị lỗi xác thực OAuth và webhook không đến? Xem [Chẩn đoán OAuth 2.0](./xu-ly-loi#chan-doan-oauth-20)

<Callout type="warn" title="Client Secret chỉ hiện đầy đủ một lần">
Mở lại chỉ thấy 4 ký tự cuối (
`****xxxx`
). SePay không lưu bản rõ. Copy ngay khi tạo. Quên thì tạo Client Secret mới (Client ID giữ nguyên).
</Callout>

## Tiếp theo

* [Bảo mật](./bao-mat): HTTPS, whitelist IP, chống replay
* [Tích hợp webhook](./tich-hop-webhook): payload, phản hồi hợp lệ, chống trùng lặp
* [Xử lý lỗi](./xu-ly-loi): retry, chẩn đoán