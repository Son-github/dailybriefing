import React, { useEffect, useState } from 'react';
import { Box, Container, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import WeatherCard from '../components/WeatherCard';
import NewsCard from '../components/NewsCard';
import ExchangeCard from '../components/ExchangeCard';
import { jwtDecode } from 'jwt-decode';
import { logout as logoutApi } from '../api/auth';
import api from '../api/api';

function Dashboard() {
    const navigate = useNavigate();
    const [userEmail, setUserEmail] = useState('');

    const handleLogout = async () => {
        try {
            await logoutApi(); // 서버 logout이 없어도 localStorage 제거는 수행됨(우리가 auth.js에 그렇게 구현)
        } finally {
            alert('로그아웃 되었습니다.');
            navigate('/login');
        }
    };

    useEffect(() => {
        // ✅ env 빠졌을 때 빠르게 알기
        if (!process.env.REACT_APP_API_BASE_URL) {
            console.error('REACT_APP_API_BASE_URL is not set');
            navigate('/login');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const decoded = jwtDecode(token);
            setUserEmail(decoded?.email || '');
            // ✅ Authorization 헤더는 api.js의 request interceptor가 자동으로 붙임
            // ✅ 만료되었어도 실제 API 호출 시 401 -> refresh -> 재시도를 api.js가 처리
        } catch (e) {
            console.error('Invalid token:', e);
            handleLogout();
        }
        // eslint-disable-next-line
    }, []);

    // (선택) 대시보드에서 사용자 정보 등을 실제로 호출하고 싶으면 여기서 api.get(...) 하면 됨
    // api.get('/auth/me') 처럼 호출하면 401 대응/refresh는 자동 처리됨

    return (
        <Box sx={{ bgcolor: '#f7f7f7', minHeight: '100vh', pb: 4 }}>
            <Header sx={{ padding: '8px 0' }} />
            <Container maxWidth="sm" sx={{ mt: 1 }}>
                <Stack spacing={2}>
                    <WeatherCard api={api} />
                    <ExchangeCard api={api} />
                    <NewsCard api={api} />
                </Stack>
            </Container>
        </Box>
    );
}

export default Dashboard;
