import React, { useEffect, useMemo, useState } from 'react';
import { Box, Container, Stack, Typography, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

import Header from '../components/Header';
import WeatherCard from '../components/WeatherCard';
import NewsCard from '../components/NewsCard';
import ExchangeCard from '../components/ExchangeCard';
import { logout as logoutApi } from '../api/auth';
import api from '../api/api';

const MotionBox = motion(Box);
const MotionStack = motion(Stack);

function Dashboard() {
    const navigate = useNavigate();
    const [userEmail, setUserEmail] = useState('');
    const [refreshKey, setRefreshKey] = useState(0); // ✅ 카드들 강제 리프레시 트리거
    const [isRefreshing, setIsRefreshing] = useState(false);

    const displayName = useMemo(() => {
        if (!userEmail) return '';
        // "sonny@gmail.com" -> "sonny"
        return userEmail.split('@')[0];
    }, [userEmail]);

    const handleLogout = async () => {
        try {
            await logoutApi();
        } finally {
            alert('로그아웃 되었습니다.');
            navigate('/login');
        }
    };

    const handleRefresh = async () => {
        // 카드들의 useEffect를 다시 돌리고 싶으면 key를 바꿔서 remount시키는 게 제일 깔끔함
        try {
            setIsRefreshing(true);
            setRefreshKey((k) => k + 1);
        } finally {
            // UX: 너무 깜빡이지 않게 아주 짧게만
            setTimeout(() => setIsRefreshing(false), 450);
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
                bgcolor: '#0b1220', // ✅ 다크 베이스 (요즘 대시보드 톤)
                overflow: 'hidden',
            }}
        >
            {/* ✅ 배경 그라데이션/블러 블랍 (트렌디한 느낌) */}
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

            <Header sx={{ padding: '8px 0' }} />

            <Container maxWidth="sm" sx={{ mt: 1, position: 'relative' }}>
                {/* ✅ 상단 “대시보드 헤더 영역” */}
                <MotionBox
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    sx={{
                        mb: 2,
                        px: 2,
                        py: 1.8,
                        borderRadius: 4,
                        bgcolor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            variant="h6"
                            sx={{
                                color: 'rgba(255,255,255,0.92)',
                                fontWeight: 900,
                                letterSpacing: '-0.02em',
                                lineHeight: 1.1,
                            }}
                        >
                            Daily Briefing
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{
                                mt: 0.5,
                                color: 'rgba(255,255,255,0.66)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {displayName ? `${displayName}님 · 오늘의 요약을 확인하세요` : '오늘의 요약을 확인하세요'}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                        <Tooltip title="새로고침">
              <span>
                <IconButton
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    sx={{
                        width: 40,
                        height: 40,
                        color: 'rgba(255,255,255,0.85)',
                        bgcolor: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                    }}
                >
                  <motion.div
                      animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                      transition={
                          isRefreshing
                              ? { repeat: Infinity, duration: 0.9, ease: 'linear' }
                              : { duration: 0.2 }
                      }
                  >
                    <RefreshIcon />
                  </motion.div>
                </IconButton>
              </span>
                        </Tooltip>

                        <Tooltip title="로그아웃">
                            <IconButton
                                onClick={handleLogout}
                                sx={{
                                    width: 40,
                                    height: 40,
                                    color: 'rgba(255,255,255,0.85)',
                                    bgcolor: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                                }}
                            >
                                <LogoutIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </MotionBox>

                {/* ✅ 카드 리스트: 등장 모션 + 간격/통일감 */}
                <MotionStack
                    key={refreshKey} // ✅ refreshKey 바뀌면 카드들이 remount되어 각 카드의 fetch가 다시 실행됨
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
                    sx={{
                        pb: 2,
                    }}
                >
                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 10 },
                            show: { opacity: 1, y: 0 },
                        }}
                    >
                        <WeatherCard api={api} />
                    </motion.div>

                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 10 },
                            show: { opacity: 1, y: 0 },
                        }}
                    >
                        <ExchangeCard api={api} />
                    </motion.div>

                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 10 },
                            show: { opacity: 1, y: 0 },
                        }}
                    >
                        <NewsCard api={api} />
                    </motion.div>
                </MotionStack>

                {/* ✅ 하단 미세 텍스트 (트렌디한 제품 느낌) */}
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
