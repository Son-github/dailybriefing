import React, { useEffect, useState } from 'react';
import { Box, Container, Stack, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import InfoCard from '../components/InfoCard';
import WeatherCard from '../components/WeatherCard';
import NewsCard from '../components/NewsCard';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

// ... (kosdaqData, nasdaqData는 생략) ...

function Dashboard() {
    const navigate = useNavigate();
    const [userEmail, setUserEmail] = useState('');

    // ✅ withCredentials: true로 쿠키 기반 refresh 요청
    const refreshAccessToken = async () => {
        try {
            const res = await axios.post(
                'http://localhost:8081/api/auth/refresh',
                {},
                { withCredentials: true }
            );
            // ✅ 필드명 accessToken에 맞춰 처리
            const { accessToken } = res.data;
            localStorage.setItem('token', accessToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            const decoded = jwtDecode(accessToken);
            setUserEmail(decoded.email || '');
        } catch (err) {
            console.error('리프레시 실패:', err);
            handleLogout();
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const now = Date.now() / 1000;
                if (decoded.exp < now) {
                    // 만료 시 자동 리프레시
                    refreshAccessToken();
                } else {
                    setUserEmail(decoded.email || '');
                }
            } catch (e) {
                console.error('Invalid token:', e);
                handleLogout();
            }
        } else {
            // 토큰 없으면 로그인으로
            navigate('/login');
        }
        // eslint-disable-next-line
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        alert('로그아웃 되었습니다.');
        navigate('/login');
    };

    return (
        <Box sx={{ bgcolor: '#f7f7f7', minHeight: '100vh', pb: 4 }}>
            <Header />

            <Box sx={{ position: 'absolute', top: 20, right: 20, textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, mr: 1 }}>
                    {userEmail ? `${userEmail} 님` : ''}
                </Typography>
                <Button
                    variant="outlined"
                    onClick={handleLogout}
                    sx={{
                        borderRadius: '8px',
                        color: '#f76d57',
                        borderColor: '#f76d57',
                        fontWeight: 'bold',
                        '&:hover': {
                            backgroundColor: '#f76d57',
                            color: '#fff',
                        }
                    }}
                >
                    로그아웃
                </Button>
            </Box>

            <Container maxWidth="sm" sx={{ mt: 10 }}>
                <Stack spacing={2}>
                    <WeatherCard />
                    <NewsCard />
                    {/* InfoCard, 차트 데이터 등 기존 코드와 동일 */}
                </Stack>
            </Container>
        </Box>
    );
}

export default Dashboard;

