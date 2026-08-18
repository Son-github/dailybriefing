import api from './api';

export async function login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
}

export async function signup(email, password) {
    const response = await api.post('/auth/signup', { email, password });
    return response.data;
}

export async function logout() {
    const response = await api.post('/auth/logout');
    return response.data;
}

export function clearLocalSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
}
