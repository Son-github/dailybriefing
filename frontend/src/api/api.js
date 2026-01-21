import axios from 'axios';

// ✅ 단일 API baseURL (로컬: 8080 gateway, 운영: CloudFront 도메인)
const API_BASE = process.env.REACT_APP_API_BASE_URL;

// axios 인스턴스 1개만 사용
const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true, // ✅ refresh cookie 포함
    headers: {
        'Content-Type': 'application/json',
    },
});

// ====== Request Interceptor: 토큰 자동 부착 ======
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// ====== Refresh 중복 호출 방지용 ======
let isRefreshing = false;
let refreshQueue = [];

// 대기열에 콜백을 넣었다가 refresh 끝나면 실행
function subscribeTokenRefresh(cb) {
    refreshQueue.push(cb);
}

function onRefreshed(newToken) {
    refreshQueue.forEach((cb) => cb(newToken));
    refreshQueue = [];
}

// ====== Response Interceptor: 401이면 자동 refresh ======
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error?.response?.status;
        const originalRequest = error?.config;

        // 네트워크 오류 등(서버가 아예 응답 X)
        if (!error.response) {
            return Promise.reject(error);
        }

        // refresh 엔드포인트 자체가 401/실패하면 무한루프 방지
        const isRefreshCall = originalRequest?.url?.includes('/auth/refresh');

        // 401이고, 아직 재시도 안 했고, refresh 호출이 아니면
        if (status === 401 && originalRequest && !originalRequest._retry && !isRefreshCall) {
            originalRequest._retry = true;

            // 이미 refresh 중이면 대기열에 넣고 토큰 받으면 재시도
            if (isRefreshing) {
                return new Promise((resolve) => {
                    subscribeTokenRefresh((newToken) => {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        resolve(api.request(originalRequest));
                    });
                });
            }

            isRefreshing = true;

            try {
                // ✅ refresh 요청 (쿠키 기반)
                const refreshRes = await api.post('/auth/refresh', {});
                const newToken = refreshRes?.data?.accessToken;

                if (!newToken) {
                    throw new Error('No accessToken from refresh');
                }

                // 토큰 저장 + 기본 헤더 갱신
                localStorage.setItem('token', newToken);
                api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

                // 대기 중인 요청들 처리
                onRefreshed(newToken);

                // 원래 요청 재시도
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api.request(originalRequest);
            } catch (refreshErr) {
                // refresh 실패 → 토큰 제거 (로그아웃 상태)
                localStorage.removeItem('token');
                return Promise.reject(refreshErr);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
