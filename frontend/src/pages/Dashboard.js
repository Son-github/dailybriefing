import React, { useEffect, useState } from 'react';
import { Box, Container, Stack, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import InfoCard from '../components/InfoCard';
import WeatherCard from '../components/WeatherCard';
import NewsCard from '../components/NewsCard';
import jwtDecode from 'jwt-decode';
import axios from 'axios';

// KOSDAQ, NASDAQ 차트에 사용할 샘플 데이터
const kosdaqData = [
    { name: 'Page A', uv: 4000, pv: 2400, amt: 2400 },
    { name: 'Page B', uv: 3000, pv: 1398, amt: 2210 },
    { name: 'Page C', uv: 2000, pv: 9800, amt: 2290 },
    { name: 'Page D', uv: 2780, pv: 3908, amt: 2000 },
    { name: 'Page E', uv: 1890, pv: 4800, amt: 2181 },
    { name: 'Page F', uv: 2390, pv: 3800, amt: 2500 },
    { name: 'Page G', uv: 3490, pv: 4300, amt: 2100 },
];

const nasdaqData = [
    { name: 'Page A', uv: 2400, pv: 2400, amt: 2400 },
    { name: 'Page B', uv: 2800, pv: 1398, amt: 2210 },
    { name: 'Page C', uv: 3200, pv: 9800, amt: 2290 },
    { name: 'Page D', uv: 3000, pv: 3908, amt: 2000 },
    { name: 'Page E', uv: 3500, pv: 4800, amt: 2181 },
    { name: 'Page F', uv: 3800, pv: 3800, amt: 2500 },
    { name: 'Page G', uv: 4000, pv: 4300, amt: 2100 },
];



function Dashboard() {
    const navigate = useNavigate();
    const [userEmail, setUserEmail] = useState('');

    const refreshAccessToken = async () => {
        try {
            const res = await axios.post('http://localhost:8081/api/auth/refresh');
            const { token } = res.data;
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const decoded = jwtDecode(token);
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
        }
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
                    <InfoCard
                        iconType="PriceChangeIcon"
                        iconColor="blue"
                        title="환율"
                        subtitle="USD/KRW"
                        mainValue="1,372.50"
                        changeValue="-5.50"
                        changeColor="red"
                    />
                    <InfoCard
                        iconType="ShowChart"
                        iconColor="blue"
                        title="코스닥"
                        leftValue="838.07"
                        rightValue="838.07"
                        changeValue="-5.63 (-0.67%)"
                        changeColor="blue"
                        chartData={kosdaqData}
                        chartColor="#2196f3"
                    />
                    <InfoCard
                        iconType="ShowChart"
                        iconColor="red"
                        title="나스닥"
                        leftValue="12,621.91"
                        rightValue="12,621.91"
                        changeValue="+55.19 (+0.44%)"
                        changeColor="red"
                        chartData={nasdaqData}
                        chartColor="#f44336"
                    />
                </Stack>
            </Container>
        </Box>
    );
}

export default Dashboard;
