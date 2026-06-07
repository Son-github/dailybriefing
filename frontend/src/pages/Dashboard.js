import React, { useEffect, useMemo, useState } from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

import Header from '../components/Header';
import WeatherCard from '../components/WeatherCard';
import NewsCard from '../components/NewsCard';
import ExchangeCard from '../components/ExchangeCard';
import { logout as logoutApi, clearLocalSession } from '../api/auth';
import api from '../api/api';

const MotionStack = motion.create(Stack);
const REFRESH_INTERVAL_MS = Number(process.env.REACT_APP_DATA_REFRESH_INTERVAL_MS || 600000);

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
        } catch (e) {
            console.error('서버 로그아웃 실패', e);
        } finally {
            clearLocalSession(); // 짧은 설명: 서버 성공 여부와 무관하게 프론트 세션 정리
            navigate('/login', { replace: true });
        }
    };

    const forceLocalLogout = () => {
        // 짧은 설명: 토큰 자체가 깨졌을 때는 서버 호출보다 로컬 정리가 우선
        clearLocalSession();
        navigate('/login', { replace: true });
    };

    const handleRefresh = () => {
        setRefreshKey((k) => k + 1);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const cachedEmail = localStorage.getItem('userEmail') || '';

        if (!token) {
            navigate('/login', { replace: true });
            return;
        }

        try {
            const decoded = jwtDecode(token);
            setUserEmail(decoded?.email || cachedEmail);
        } catch (e) {
            console.error('Invalid token:', e);
            forceLocalLogout();
        }
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        // 이전에는 사용자가 버튼을 눌러야만 카드가 갱신됐다. 이제 모든 카드를 10분마다 다시 마운트한다.
        const timer = window.setInterval(handleRefresh, REFRESH_INTERVAL_MS);
        return () => window.clearInterval(timer);
    }, []);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                pb: 7,
                position: 'relative',
                overflow: 'hidden',
                background:
                    'linear-gradient(180deg, #f5fbff 0%, #ffffff 42%, #eef7ff 100%)',
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    overflow: 'hidden',
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: -120,
                        left: -80,
                        width: 260,
                        height: 260,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(125,211,252,0.45) 0%, rgba(125,211,252,0.12) 45%, rgba(125,211,252,0) 72%)',
                        filter: 'blur(10px)',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        top: 80,
                        right: -90,
                        width: 280,
                        height: 280,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(165,180,252,0.34) 0%, rgba(165,180,252,0.10) 45%, rgba(165,180,252,0) 72%)',
                        filter: 'blur(12px)',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -120,
                        left: '18%',
                        width: 240,
                        height: 240,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(103,232,249,0.24) 0%, rgba(103,232,249,0.08) 45%, rgba(103,232,249,0) 72%)',
                        filter: 'blur(12px)',
                    }}
                />
            </Box>

            <Header userEmail={userEmail} onLogout={handleLogout} onRefresh={handleRefresh} />

            <Container
                maxWidth="sm"
                sx={{
                    position: 'relative',
                    mt: { xs: 0.5, sm: 1 },
                    px: { xs: 1.6, sm: 2.2 },
                }}
            >
                <Box
                    sx={{
                        px: 0.5,
                        mb: 2.2,
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45 }}
                    >
                        <Box
                            sx={{
                                borderRadius: '28px',
                                px: 2.2,
                                py: 2.3,
                                background:
                                    'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(240,249,255,0.96) 52%, rgba(224,242,254,0.92) 100%)',
                                border: '1px solid rgba(255,255,255,0.85)',
                                boxShadow: '0 12px 40px rgba(148, 163, 184, 0.14)',
                                backdropFilter: 'blur(10px)',
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    px: 1.2,
                                    py: 0.5,
                                    mb: 1.2,
                                    borderRadius: '999px',
                                    bgcolor: 'rgba(14,165,233,0.10)',
                                    color: '#0369a1',
                                    fontSize: 11,
                                    fontWeight: 800,
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                Personalized Daily Briefing
                            </Box>

                            <Typography
                                sx={{
                                    color: '#0f172a',
                                    fontWeight: 900,
                                    letterSpacing: '-0.04em',
                                    fontSize: { xs: 24, sm: 28 },
                                    lineHeight: 1.15,
                                }}
                            >
                                {displayName
                                    ? `${displayName}님, 오늘도 가볍게 시작해볼까요?`
                                    : '오늘도 가볍게 시작해볼까요?'}
                            </Typography>

                            <Typography
                                sx={{
                                    mt: 1,
                                    color: '#475569',
                                    fontSize: 13.5,
                                    lineHeight: 1.65,
                                    fontWeight: 500,
                                }}
                            >
                                서울 날씨, 환율, 시장 흐름, 뉴스 브리핑까지
                                <br />
                                한 화면에서 산뜻하게 확인해보세요.
                            </Typography>

                            <Box
                                sx={{
                                    mt: 1.6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.2,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Box
                                    onClick={handleRefresh}
                                    sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        px: 1.6,
                                        py: 0.95,
                                        borderRadius: '999px',
                                        bgcolor: '#0f172a',
                                        color: '#ffffff',
                                        fontSize: 12,
                                        fontWeight: 800,
                                        letterSpacing: '-0.01em',
                                        cursor: 'pointer',
                                        boxShadow: '0 10px 24px rgba(15,23,42,0.14)',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 14px 28px rgba(15,23,42,0.18)',
                                        },
                                    }}
                                >
                                    새로고침
                                </Box>

                                <Typography
                                    sx={{
                                        fontSize: 12,
                                        color: '#64748b',
                                        fontWeight: 600,
                                    }}
                                >
                                    카드 데이터는 10분마다 자동으로 갱신돼요
                                </Typography>
                            </Box>
                        </Box>
                    </motion.div>
                </Box>

                <MotionStack
                    key={refreshKey}
                    spacing={2}
                    initial="hidden"
                    animate="show"
                    variants={{
                        hidden: { opacity: 0 },
                        show: {
                            opacity: 1,
                            transition: { staggerChildren: 0.08 },
                        },
                    }}
                    sx={{ pb: 2 }}
                >
                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 14 },
                            show: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.35 }}
                    >
                        <WeatherCard api={api} />
                    </motion.div>

                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 14 },
                            show: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.35 }}
                    >
                        <ExchangeCard api={api} />
                    </motion.div>

                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 14 },
                            show: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.35 }}
                    >
                        <NewsCard api={api} />
                    </motion.div>
                </MotionStack>

                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        mt: 1.4,
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontWeight: 600,
                        letterSpacing: '-0.01em',
                    }}
                >
                    Data updates automatically · Secure session with refresh cookies
                </Typography>
            </Container>
        </Box>
    );
}

export default Dashboard;
