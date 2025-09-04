import React, { useEffect, useState } from 'react';
import { Box, Container, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import WeatherCard from '../components/WeatherCard';
import NewsCard from '../components/NewsCard';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import ExchangeCard from "../components/ExchangeCard";

function Dashboard() {
    const navigate = useNavigate();
    const [userEmail, setUserEmail] = useState('');

    const refreshAccessToken = async () => {
        try {
            const res = await axios.post(
                '/api/auth/refresh',
                {},
                { withCredentials: true }
            );
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
                    refreshAccessToken();
                } else {
                    setUserEmail(decoded.email || '');
                }
            } catch (e) {
                console.error('Invalid token:', e);
                handleLogout();
            }
        } else {
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
            {/* Header 패딩도 최소화 */}
            <Header sx={{ padding: '8px 0' }} />
            <Container maxWidth="sm" sx={{ mt: 1 }}> {/* marginTop을 거의 없앰 */}
                <Stack spacing={2}>
                    <WeatherCard />
                    <ExchangeCard />
                    <NewsCard />
                </Stack>
            </Container>
        </Box>
    );
}

export default Dashboard;

