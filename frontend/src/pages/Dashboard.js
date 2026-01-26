import React, { useEffect, useMemo, useState } from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

import Header from '../components/Header';
import WeatherCard from '../components/WeatherCard';
import NewsCard from '../components/NewsCard';
import ExchangeCard from '../components/ExchangeCard';
import { logout as logoutApi } from '../api/auth';
import api from '../api/api';

const MotionStack = motion.create(Stack);

function Dashboard() {
    const navigate = useNavigate();
    const [userEmail, setUserEmail] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    const displayName = useMemo(() => {
        if (!userEmail) return '';
        return userEmail.split('@')[0];
    }, [userEmail]);

    const handleLogout = async () => {
        try {
            await logoutApi();
        } finally {
            navigate('/login');
        }
    };

    const handleRefresh = () => {
        setRefreshKey((k) => k + 1);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const decoded = jwtDecode(token);
            setUserEmail(decoded?.email || '');
        } catch (e) {
            console.error('Invalid token:', e);
            handleLogout();
        }
        // eslint-disable-next-line
    }, []);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                pb: 6,
                position: 'relative',
                bgcolor: '#0b1220',
                overflow: 'hidden',
            }}
        >
            {/* 배경 그라데이션 */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background:
                        'radial-gradient(900px circle at 20% 10%, rgba(34,197,94,0.22), transparent 55%), radial-gradient(900px circle at 80% 20%, rgba(59,130,246,0.18), transparent 55%), radial-gradient(900px circle at 50% 90%, rgba(168,85,247,0.16), transparent 55%)',
                    filter: 'blur(2px)',
                }}
            />

            {/* ✅ 헤더는 1개만: 로그아웃도 여기서 */}
            <Header userEmail={userEmail} onLogout={handleLogout} />

            <Container
                maxWidth="sm"
                sx={{
                    mt: 0.5,
                    position: 'relative',
                    px: { xs: 1.5, sm: 2 },
                }}
            >
                {/* ✅ 헤더 아래 ‘간단한 인사 문구’만(헤더처럼 보이지 않게) */}
                <Box sx={{ px: 0.5, mb: 1.6 }}>
                    <Typography
                        sx={{
                            color: 'rgba(255,255,255,0.92)',
                            fontWeight: 900,
                            letterSpacing: '-0.02em',
                            fontSize: 18,
                            lineHeight: 1.15,
                        }}
                    >
                        {displayName ? `${displayName}님, 오늘도 화이팅!` : '오늘도 화이팅!'}
                    </Typography>
                    <Typography sx={{ mt: 0.6, color: 'rgba(255,255,255,0.62)', fontSize: 13 }}>
                        한 번의 새로고침으로 카드들이 최신 데이터로 갱신돼요.
                    </Typography>

                    {/* ✅ 새로고침은 카드 영역에서 자연스럽게(텍스트 링크 느낌) */}
                    <Typography
                        onClick={handleRefresh}
                        sx={{
                            mt: 0.9,
                            display: 'inline-block',
                            fontSize: 12,
                            fontWeight: 900,
                            color: 'rgba(255,255,255,0.75)',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textUnderlineOffset: '3px',
                            '&:hover': { color: 'rgba(255,255,255,0.9)' },
                        }}
                    >
                        새로고침
                    </Typography>
                </Box>

                {/* 카드 리스트 */}
                <MotionStack
                    key={refreshKey}
                    spacing={2}
                    initial="hidden"
                    animate="show"
                    variants={{
                        hidden: { opacity: 0 },
                        show: { opacity: 1, transition: { staggerChildren: 0.08 } },
                    }}
                    sx={{ pb: 2 }}
                >
                    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                        <WeatherCard api={api} />
                    </motion.div>

                    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                        <ExchangeCard api={api} />
                    </motion.div>

                    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                        <NewsCard api={api} />
                    </motion.div>
                </MotionStack>

                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        mt: 1,
                        textAlign: 'center',
                        color: 'rgba(255,255,255,0.45)',
                    }}
                >
                    Data updates automatically · Secure session with refresh cookies
                </Typography>
            </Container>
        </Box>
    );
}

export default Dashboard;
