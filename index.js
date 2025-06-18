const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
// const crypto = require('crypto');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 5500;

// body 파싱
/*
Client -> 10.34.3.3 
Server => data -> WebServer -> Process -> Client

Middleware ???

Server => data -> Middleware 1 -> WebServer -> Process -> Middleware 2 -> Client


Body Parser Middleware??

=> 클라이언트가 보내는 데이터를 자바스크립트(express)에서 해석할 수 있도록 파싱(해석) 하는 미들웨어
예: express.json() => JSON Parsing (요청/응답엔 Body라는 원하고자 하는 데이터가 있는데 그걸 해석하자는거)
express.url ,, => URL Query Parsring = https://localhost:8080/sdfsdf?key=value
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------- 암호화 관련 ----------------
// const algorithm = 'aes-256-cbc';
// const secretKey = crypto.createHash('sha256').update('my_secret_key').digest(); // 실제는 .env에서
// const iv = Buffer.from('a2xhcgAAAAAAAAAA'); // 16바이트 고정 IV

// function encryptUsername(username) {
//   const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
//   let encrypted = cipher.update(username, 'utf8', 'hex');
//   encrypted += cipher.final('hex');
//   return encrypted;
// }

// function decryptUsername(encrypted) {
//   const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
//   let decrypted = decipher.update(encrypted, 'hex', 'utf8');
//   decrypted += decipher.final('utf8');
//   return decrypted;
// }

// ------------- MySQL 연결 설정 ----------------
const dbConfig = {
  host: 'localhost',
  user: 'myuser',
  password: 'mypassword',
  database: 'mydatabase',
};


let pool; 
(async () => {
  pool = mysql.createPool(dbConfig);

  // 유저 테이블 생성 (최초 1회 실행용)
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL
    );
  `;
  await pool.query(createTableQuery);
})();
//mysql -u root -p;
//USE mydatabase;
//SELECT * FROM users;
// ------------- 회원가입 라우터 ----------------

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('아이디와 비밀번호를 모두 입력하세요.');
  }

  try {
    // 중복 확인 (모든 유저 조회 후 복호화 비교)
    const [rows] = await pool.query('SELECT username FROM users');
    const exists = rows.some(row => {
      try {
        return row.username === username;
      } catch {
        return false;
      }
    });

    if (exists) {
      return res.status(400).send('이미 존재하는 아이디입니다.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);

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

  try {
    const [rows] = await pool.query('SELECT username, password FROM users');
    const user = rows.find(row => {
      try {
        return row.username === username;
      } catch {
        return false;
      }
    });

    if (!user) {
      return res.status(400).send('존재하지 않는 아이디입니다.');
    }

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
