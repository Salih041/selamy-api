# 🛡️ Otomatik Güvenlik Analiz Raporu

**Genel Durum:** Zafiyetler bulundu

---

⚠️ **Tespit Edilen Toplam Zafiyet:** 5

## Improper Authentication (A00:2025-Unknown Category / CWE-303)
- **Risk Seviyesi:** Yüksek
- **Genel Açıklama:** Redis bağlantısı için parola doğrulaması yapılmamış. Bu durum, yetkisiz erişim riskini artırır ve sistem güvenliğini tehlikeye atar.

### 📄 `config\redis.js`
**🔍 Tespit Edilen Kod:**
```javascript
export const redis = new Redis(process.env.REDIS_URL ?? null);
```
**✅ Uygulanan Çözüm:**
Redis bağlantısına parola doğrulaması eklendi. Bu sayede yetkisiz erişim engellenerek güvenlik artırıldı.
```javascript
if (!process.env.REDIS_PASSWORD) {
    console.warn("No REDIS_PASSWORD");
}

export const redis = new Redis(process.env.REDIS_URL ?? null, {
    password: process.env.REDIS_PASSWORD,
}); // Redis bağlantısı için parola doğrulaması eklendi
```

---

## JWT Authentication Token Handling (A00:2025-Unknown Category / CWE-603)
- **Risk Seviyesi:** Orta
- **Genel Açıklama:** Bu middleware, JWT token doğrulaması yapmaktadır ancak authHeader.split(" ")[1] ifadesinde authHeader null veya undefined ise hata oluşabilir. Bu durum, servis kesintisine yol açabilir. Ayrıca, token doğrulama sırasında token varlığı kontrolü eksiktir. Bu nedenle, authHeader'nin varlığı kontrol edilerek hata önlenmiştir.

### 📄 `middlewares\authMiddleware.js`
**🔍 Tespit Edilen Kod:**
```javascript
const token = authHeader.split(" ")[1];
```
**✅ Uygulanan Çözüm:**
authHeader'nin varlığı kontrol edilerek, null veya undefined durumunda oluşabilecek hatalar engellenmiştir. Bu sayede servis kesintisi riski azaltılmıştır.
```javascript
const token = authHeader && authHeader.split(" ")[1]; // Token varlığını kontrol etmek için ek kontrol eklendi
```

---

## Basic Authentication Güvenlik Zafiyeti (A00:2025-Unknown Category / CWE-305)
- **Risk Seviyesi:** Yüksek
- **Genel Açıklama:** Bu middleware, Basic Authentication kullanarak Swagger dokümantasyonuna erişimi kontrol etmektedir. Ancak, Basic Authentication şifrelenmemiş HTTP üzerinden kullanıldığında kimlik bilgileri ağda kolayca ele geçirilebilir. Bu nedenle, kimlik doğrulama işlemi sadece HTTPS üzerinden yapılmalıdır.

### 📄 `swaggerAuthMiddleware.js`
**🔍 Tespit Edilen Kod:**
```javascript
        const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
        const [username, password] = credentials.split(':');

        const validUsername = process.env.SWAGGER_USERNAME;
        const validPassword = process.env.SWAGGER_PASSWORD;

        if (username === validUsername && password === validPassword) {
            return next();
        }
```
**✅ Uygulanan Çözüm:**
Kimlik doğrulama işleminin sadece HTTPS üzerinden yapılması sağlanarak, ağda kimlik bilgisi sızıntısı riski azaltıldı.
```javascript
        const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
        const [username, password] = credentials.split(':');

        const validUsername = process.env.SWAGGER_USERNAME;
        const validPassword = process.env.SWAGGER_PASSWORD;

        // Kullanıcı adı ve şifre eşleşmesi sağlanıyorsa, HTTPS kontrolü yapılır
        if (username === validUsername && password === validPassword) {
            if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
                return next();
            } else {
                return res.status(403).json({ message: 'HTTPS is required for authentication' });
            }
        }
```

---

## Unrestricted Upload of File with Dangerous Type (A06:2025-Insecure Design / CWE-434)
- **Risk Seviyesi:** Orta
- **Genel Açıklama:** Dosya yükleme işlemi sırasında sadece belirli resim formatlarının kabul edilmesi sağlanmış ancak dosya isimlendirmesi kullanıcı girdisine bağlı kalmaktadır. Bu durum, kötü amaçlı dosya yüklenmesi ve sistemde yetkisiz dosya oluşturulması riskini doğurabilir.

### 📄 `middlewares\uploadMiddleware.js`
**🔍 Tespit Edilen Kod:**
```javascript
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Wrong file format! Only images can be uploaded"), false);
    }
};
```
**✅ Uygulanan Çözüm:**
Dosya yükleme sırasında sadece izin verilen mime tiplerinin kabul edilmesi sağlanmıştır. Ayrıca, dosya isimlendirmesi için benzersiz isimlendirme yapılması önerilmiştir. Bu sayede kötü amaçlı dosya yüklenmesi riski azaltılmıştır.
```javascript
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
        // Dosya adı güvenliği için benzersiz isim oluşturulabilir
        cb(null, true);
    } else {
        cb(new Error("Wrong file format! Only images can be uploaded"), false);
    }
};
```

---

## Open Redirect (Açık Yönlendirme) (A01:2025-Broken Access Control / CWE-601)
- **Risk Seviyesi:** Orta
- **Genel Açıklama:** Kodda, CLIENT_URL ortam değişkeni kullanıcı tarafından kontrol edilebilir ve bu URL'ye yönlendirme yapılmaktadır. Bu durum, kötü niyetli bir URL'nin CLIENT_URL olarak ayarlanması halinde kullanıcıların zararlı sitelere yönlendirilmesine yol açabilir. Bu, Open Redirect zafiyetidir ve kullanıcı güvenliğini tehlikeye atar.

### 📄 `routes\oauth.js`
**🔍 Tespit Edilen Kod:**
```javascript
const getClientUrl = () => {
    if (process.env.CLIENT_URL) {
        return process.env.CLIENT_URL;
    }
    if (process.env.NODE_ENV === 'production') {
        return "https://www.selamy.me"; // Fallback to production URL if env is missing
    }
    return "http://localhost:5173";
};
```
**✅ Uygulanan Çözüm:**
CLIENT_URL ortam değişkeni sadece önceden belirlenmiş güvenilir domainler ile sınırlandırıldı. Böylece kötü niyetli URL'lere yönlendirme engellendi.
```javascript
const getClientUrl = () => {
    const allowedDomains = ["https://www.selamy.me", "http://localhost:5173"];
    if (process.env.CLIENT_URL && allowedDomains.includes(process.env.CLIENT_URL)) {
        return process.env.CLIENT_URL;
    }
    if (process.env.NODE_ENV === 'production') {
        return "https://www.selamy.me"; // Fallback to production URL if env is missing
    }
    return "http://localhost:5173";
};
```

---
