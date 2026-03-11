# 🔒 Hướng Dẫn Bảo Mật

## ⚠️ CẢNH BÁO QUAN TRỌNG

Bot này chứa **THÔNG TIN NHẠY CẢM** (mật khẩu) trong file `config.json`.  
Việc BẢO VỆ thông tin này là **TRÁCH NHIỆM CỦA BẠN**.

---

## 🛡️ Checklist Bảo Mật

### ✅ Trước Khi Public Bot:

- [ ] **Đã tạo file `.gitignore`** và thêm `config.json` vào đó
- [ ] **Kiểm tra Git history** - Đảm bảo `config.json` chưa từng được commit
- [ ] **Tạo file `config.example.json`** - Template không chứa thông tin nhạy cảm
- [ ] **Kiểm tra lại tất cả commit** - Không có mật khẩu nào bị lộ
- [ ] **Đọc kỹ README.md** - Hướng dẫn người dùng cấu hình an toàn

### ✅ Khi Sử Dụng Bot:

- [ ] **Không dùng mật khẩu chính** - Tạo mật khẩu riêng cho bot
- [ ] **Không chia sẻ file config.json** - Với bất kỳ ai
- [ ] **Không screenshot config** - Có thể lộ mật khẩu
- [ ] **Bật 2FA nếu dùng Microsoft account** - Bảo vệ tài khoản chính
- [ ] **Định kỳ đổi mật khẩu** - Ít nhất 3 tháng/lần

---

## 🚨 Nếu Lộ Mật Khẩu

### Bước 1: ĐỔI MẬT KHẨU NGAY LẬP TỨC
- Đổi mật khẩu server Minecraft
- Đổi mật khẩu Microsoft/Mojang account (nếu có)

### Bước 2: XÓA KHỎI GIT HISTORY
Nếu đã commit `config.json` lên GitHub:

```bash
# Xóa file khỏi Git history (NGUY HIỂM - backup trước!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch config.json" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (chỉ làm nếu repo là của bạn!)
git push origin --force --all
```

**LƯU Ý:** Lệnh trên sẽ XÓA VĨNH VIỄN file khỏi lịch sử Git.  
Nếu không chắc chắn, hãy xin trợ giúp!

### Bước 3: BÁO CÁO
- Nếu repo public, xóa repo cũ và tạo repo mới
- Thông báo cho admin server (nếu cần)

---

## 🔐 Best Practices

### 1. Sử Dụng Biến Môi Trường (Nâng Cao)

Thay vì lưu mật khẩu trong `config.json`, dùng file `.env`:

```bash
# File .env (không commit!)
BOT_PASSWORD=your_secure_password
```

```javascript
// Trong index.js
import dotenv from 'dotenv';
dotenv.config();

const password = process.env.BOT_PASSWORD || config.bot_account.password;
```

### 2. Sử Dụng Git Hooks (Tự Động Kiểm Tra)

Tạo file `.git/hooks/pre-commit`:

```bash
#!/bin/bash
if git diff --cached --name-only | grep -q "config.json"; then
  echo "❌ ERROR: Không được commit file config.json!"
  echo "File này chứa mật khẩu và thông tin nhạy cảm."
  exit 1
fi
```

### 3. Mã Hóa Config (Nâng Cao)

```javascript
// Mã hóa config.json trước khi lưu
import crypto from 'crypto';

function encryptConfig(config, key) {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  // ... logic mã hóa
}
```

---

## 🧪 Kiểm Tra Rò Rỉ

### Kiểm tra Git History:

```bash
# Tìm "password" trong lịch sử commit
git log -S "password" --all --source

# Xem tất cả file đã từng commit
git log --all --pretty=format: --name-only --diff-filter=A | sort -u
```

### Kiểm tra GitHub:

1. Vào https://github.com/YOUR_USERNAME/YOUR_REPO
2. Tìm kiếm: `"password"` hoặc tên server
3. Nếu thấy kết quả → XÓA NGAY

---

## 📞 Báo Lỗi Bảo Mật

Nếu phát hiện lỗ hổng bảo mật trong bot:

**KHÔNG tạo Issue công khai!**

Thay vào đó, gửi email riêng tư:
📧 **trongthinhm@gmail.com**

Tiêu đề: `[SECURITY] Lỗi bảo mật trong bot-afk-aternos`

---

## 📚 Tài Nguyên Bổ Sung

- [GitHub - Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [OWASP - Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Git - gitignore Documentation](https://git-scm.com/docs/gitignore)

---

## ✅ Kết Luận

**3 ĐIỀU QUAN TRỌNG NHẤT:**

1. ✅ **LUÔN kiểm tra `.gitignore` trước khi commit**
2. ✅ **KHÔNG BAO GIỜ commit file chứa mật khẩu**
3. ✅ **ĐỔI MẬT KHẨU NGAY nếu bị lộ**

**Bảo mật là trách nhiệm của CHÚNG TA!** 🔒
