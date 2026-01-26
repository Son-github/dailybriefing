import api from './api';

export async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    return res.data; // { accessToken, tokenType, message }
}

// ✅ weatherRegion 추가 (없으면 SEOUL로 기본)
export async function signup(email, password, weatherRegion = 'SEOUL') {
    const res = await api.post('/auth/signup', { email, password, weatherRegion });
    return res.data;
}

// ✅ 서버 로그아웃 엔드포인트 호출 + 로컬 정리
export async function logout() {
    try {
        await api.post('/auth/logout', {});
    } catch (e) {
        // accessToken 만료 등으로 실패해도 로컬 로그아웃은 진행
    } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('weatherRegion');
    }
}
