import api from './api';

export async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    return res.data; // { accessToken, ... }
}

export async function signup(email, password) {
    const res = await api.post('/auth/signup', { email, password });
    return res.data;
}

export async function logout() {
    // 서버에 logout 엔드포인트가 있으면 호출 (없으면 생략 가능)
    // await api.post('/auth/logout', {});
    localStorage.removeItem('token');
}
