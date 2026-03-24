import api from './api';

export async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
}

export async function signup(email, password, weatherRegion) {
    const res = await api.post('/auth/signup', { email, password, weatherRegion });
    return res.data;
}

export async function logout() {
    // 짧은 설명: 서버 쪽 refreshToken 무효화 요청
    const res = await api.post('/auth/logout');
    return res.data;
}

export function clearLocalSession() {
    // 짧은 설명: 프론트에 남아 있는 인증 흔적 정리
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('weatherRegion');
}
