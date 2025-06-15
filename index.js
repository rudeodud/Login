const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const app = express();
const PORT = 5500;

// body 파싱
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// users.json 경로
const usersFile = path.join(__dirname, 'users.json');

// ---------------- 암호화 관련 ----------------
const algorithm = 'aes-256-cbc';
const secretKey = crypto.createHash('sha256').update('my_secret_key').digest(); // 실제는 .env에서
const iv = Buffer.from('a2xhcgAAAAAAAAAA'); // 16바이트 고정 IV

function encryptUsername(username) {
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(username, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptUsername(encrypted) {
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ------------- 사용자 파일 처리 ----------------

function readUsers() {
  if (!fs.existsSync(usersFile)) return [];
  const data = fs.readFileSync(usersFile, 'utf8');
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// ------------- 회원가입 라우터 ----------------

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('아이디와 비밀번호를 모두 입력하세요.');
  }

  const users = readUsers();

  // 중복 확인 (복호화해서 비교)
  const exists = users.find(u => {
    try {
      return decryptUsername(u.username) === username;
    } catch {
      return false;
    }
  });

  if (exists) {
    return res.status(400).send('이미 존재하는 아이디입니다.');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const encryptedUsername = encryptUsername(username);

    users.push({ username: encryptedUsername, password: hashedPassword });
    saveUsers(users);

    res.send('회원가입 성공!');
  } catch (err) {
    console.error(err);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

// ------------- 로그인 라우터 ----------------

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('아이디와 비밀번호를 모두 입력하세요.');
  }

  const users = readUsers();

  const user = users.find(u => {
    try {
      return decryptUsername(u.username) === username;
    } catch {
      return false;
    }
  });

  if (!user) {
    return res.status(400).send('존재하지 않는 아이디입니다.');
  }

  try {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send('비밀번호가 일치하지 않습니다.');
    }

    res.send('로그인 성공!');
  } catch (err) {
    console.error(err);
    res.status(500).send('서버 오류가 발생했습니다.');
  }
});

// ------------- 정적 파일 서빙 ----------------

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// ------------- 루트 라우팅 ----------------

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

// ------------- 서버 실행 ----------------

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://127.0.0.1:${PORT}`);
});
