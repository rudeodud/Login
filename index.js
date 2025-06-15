const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5500;

// 요청 바디 파싱 미들웨어 (반드시 라우터 선언보다 먼저)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// users.json 경로
const usersFile = path.join(__dirname, 'users.json');

// 유저 정보 읽기
function readUsers() {
  if (!fs.existsSync(usersFile)) return [];
  const data = fs.readFileSync(usersFile, 'utf8');
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 유저 정보 저장
function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// 로그인 POST 처리
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('아이디와 비밀번호를 모두 입력하세요.');
  }

  const users = readUsers();
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(400).send('존재하지 않는 아이디입니다.');
  }

  if (user.password !== password) {
    return res.status(400).send('비밀번호가 일치하지 않습니다.');
  }

  res.send('로그인 성공!');
});

// 회원가입 POST 처리
app.post('/signup', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('아이디와 비밀번호를 모두 입력하세요.');
  }

  const users = readUsers();

  if (users.find(u => u.username === username)) {
    return res.status(400).send('이미 존재하는 아이디입니다.');
  }

  users.push({ username, password });
  saveUsers(users);

  res.send('회원가입 성공!');
});

// 정적 파일 제공
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// 루트 접속 시 main.html 제공
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://127.0.0.1:${PORT}`);
});
