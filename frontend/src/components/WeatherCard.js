// src/components/WeatherCard.js
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Typography, Box, Skeleton, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import CloudRoundedIcon from '@mui/icons-material/CloudRounded';
import CloudQueueRoundedIcon from '@mui/icons-material/CloudQueueRounded';
import ThunderstormRoundedIcon from '@mui/icons-material/ThunderstormRounded';
import AcUnitRoundedIcon from '@mui/icons-material/AcUnitRounded';
import UmbrellaRoundedIcon from '@mui/icons-material/UmbrellaRounded';
import api from '../api/api';

const MotionCard = motion.create(Card);
const MotionBox = motion.create(Box);

const REGION_LABEL = {
    SEOUL: '서울',
    BUSAN: '부산',
    INCHEON: '인천',
    DAEGU: '대구',
    DAEJEON: '대전',
    GWANGJU: '광주',
    JEJU: '제주',
};

function WeatherCard() {
    const [loading, setLoading] = useState(true);
    const [region, setRegion] = useState('SEOUL');
    const [temperature, setTemperature] = useState('-');
    const [sky, setSky] = useState('-');
    const [baseDate, setBaseDate] = useState('');
    const [baseTime, setBaseTime] = useState('');
    const [error, setError] = useState('');

    const locationText = useMemo(() => REGION_LABEL[region] || '서울', [region]);

    const weatherMeta = useMemo(() => {
        if (!sky || sky === '-') {
            return {
                icon: <CloudQueueRoundedIcon sx={{ fontSize: 56 }} />,
                iconColor: '#64748b',
                badgeText: 'Weather Live',
                bg: 'linear-gradient(135deg, #f8fbff 0%, #eef6ff 55%, #f8fbff 100%)',
                orb: 'radial-gradient(circle, rgba(191,219,254,0.75) 0%, rgba(191,219,254,0.18) 48%, rgba(191,219,254,0) 72%)',
                iconWrap: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,245,249,0.95) 100%)',
            };
        }

        if (sky.includes('소나기')) {
            return {
                icon: <ThunderstormRoundedIcon sx={{ fontSize: 58 }} />,
                iconColor: '#7c3aed',
                badgeText: 'Shower Alert',
                bg: 'linear-gradient(135deg, #f7f5ff 0%, #eef2ff 52%, #f5f3ff 100%)',
                orb: 'radial-gradient(circle, rgba(196,181,253,0.72) 0%, rgba(196,181,253,0.16) 48%, rgba(196,181,253,0) 72%)',
                iconWrap: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(243,232,255,0.92) 100%)',
            };
        }

        if (sky.includes('비/눈')) {
            return {
                icon: <UmbrellaRoundedIcon sx={{ fontSize: 56 }} />,
                iconColor: '#2563eb',
                badgeText: 'Rain & Snow',
                bg: 'linear-gradient(135deg, #f4f8ff 0%, #e8f1ff 52%, #f8fbff 100%)',
                orb: 'radial-gradient(circle, rgba(147,197,253,0.72) 0%, rgba(147,197,253,0.16) 48%, rgba(147,197,253,0) 72%)',
                iconWrap: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(239,246,255,0.94) 100%)',
            };
        }

        if (sky.includes('비')) {
            return {
                icon: <UmbrellaRoundedIcon sx={{ fontSize: 56 }} />,
                iconColor: '#0284c7',
                badgeText: 'Rainy Mood',
                bg: 'linear-gradient(135deg, #f5fbff 0%, #ebf8ff 52%, #f8fcff 100%)',
                orb: 'radial-gradient(circle, rgba(125,211,252,0.72) 0%, rgba(125,211,252,0.14) 48%, rgba(125,211,252,0) 72%)',
                iconWrap: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(240,249,255,0.94) 100%)',
            };
        }

        if (sky.includes('눈')) {
            return {
                icon: <AcUnitRoundedIcon sx={{ fontSize: 56 }} />,
                iconColor: '#38bdf8',
                badgeText: 'Snow Day',
                bg: 'linear-gradient(135deg, #f7fcff 0%, #eff8ff 52%, #f9fdff 100%)',
                orb: 'radial-gradient(circle, rgba(186,230,253,0.72) 0%, rgba(186,230,253,0.16) 48%, rgba(186,230,253,0) 72%)',
                iconWrap: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,249,255,0.95) 100%)',
            };
        }

        if (sky.includes('맑음')) {
            return {
                icon: <WbSunnyRoundedIcon sx={{ fontSize: 58 }} />,
                iconColor: '#f59e0b',
                badgeText: 'Sunny Today',
                bg: 'linear-gradient(135deg, #fffdf5 0%, #fff7d6 45%, #eef9ff 100%)',
                orb: 'radial-gradient(circle, rgba(253,224,71,0.72) 0%, rgba(253,224,71,0.16) 48%, rgba(253,224,71,0) 72%)',
                iconWrap: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,251,235,0.95) 100%)',
            };
        }

        if (sky.includes('구름')) {
            return {
                icon: <CloudRoundedIcon sx={{ fontSize: 58 }} />,
                iconColor: '#6366f1',
                badgeText: 'Cloudy Sky',
                bg: 'linear-gradient(135deg, #f8faff 0%, #edf2ff 52%, #f8fbff 100%)',
                orb: 'radial-gradient(circle, rgba(165,180,252,0.72) 0%, rgba(165,180,252,0.16) 48%, rgba(165,180,252,0) 72%)',
                iconWrap: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(238,242,255,0.94) 100%)',
            };
        }

        if (sky.includes('흐림')) {
            return {
                icon: <CloudQueueRoundedIcon sx={{ fontSize: 58 }} />,
                iconColor: '#64748b',
                badgeText: 'Soft Cloud',
                bg: 'linear-gradient(135deg, #fafcff 0%, #f1f5f9 52%, #f8fbff 100%)',
                orb: 'radial-gradient(circle, rgba(203,213,225,0.78) 0%, rgba(203,213,225,0.18) 48%, rgba(203,213,225,0) 72%)',
                iconWrap: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.95) 100%)',
            };
        }

        return {
            icon: <CloudQueueRoundedIcon sx={{ fontSize: 56 }} />,
            iconColor: '#64748b',
            badgeText: 'Weather Live',
            bg: 'linear-gradient(135deg, #f8fbff 0%, #eef6ff 55%, #f8fbff 100%)',
            orb: 'radial-gradient(circle, rgba(191,219,254,0.75) 0%, rgba(191,219,254,0.18) 48%, rgba(191,219,254,0) 72%)',
            iconWrap: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,245,249,0.95) 100%)',
        };
    }, [sky]);

    const weatherText = useMemo(() => {
        if (sky === '-' || temperature === '-') return '최신 날씨 정보를 불러오는 중이에요';
        return `${sky} · 지금 확인하기 좋은 날씨예요`;
    }, [sky, temperature]);

    useEffect(() => {
        let mounted = true;

        const fetchWeather = async () => {
            try {
                setLoading(true);
                setError('');

                const stored = localStorage.getItem('weatherRegion') || 'SEOUL';
                const normalized = (stored || 'SEOUL').toUpperCase();
                if (mounted) setRegion(normalized);

                const res = await api.get(`/weather/summary?region=${encodeURIComponent(normalized)}`);

                if (!mounted) return;

                setRegion(res.data?.region || normalized);
                setTemperature(res.data?.temperature ?? '-');
                setSky(res.data?.sky ?? '-');
                setBaseDate(res.data?.baseDate ?? '');
                setBaseTime(res.data?.baseTime ?? '');
            } catch (e) {
                console.error('날씨 정보를 불러오지 못했습니다:', e);
                if (!mounted) return;
                setError('날씨 정보를 불러오지 못했어요.');
                setTemperature('-');
                setSky('-');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchWeather();
        return () => {
            mounted = false;
        };
    }, []);

    return (
        <MotionCard
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            whileHover={{ y: -4, scale: 1.01 }}
            sx={{
                borderRadius: '30px',
                overflow: 'hidden',
                position: 'relative',
                background: weatherMeta.bg,
                border: '1px solid rgba(255,255,255,0.92)',
                boxShadow: '0 16px 40px rgba(148,163,184,0.16)',
                backdropFilter: 'blur(12px)',
            }}
        >
            {/* 배경 포인트 */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: -48,
                        right: -18,
                        width: 170,
                        height: 170,
                        borderRadius: '50%',
                        background: weatherMeta.orb,
                        filter: 'blur(4px)',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -58,
                        left: -24,
                        width: 150,
                        height: 150,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 74%)',
                    }}
                />
            </Box>

            <CardContent
                sx={{
                    p: { xs: 2.3, sm: 3 },
                    position: 'relative',
                }}
            >
                {/* 상단 라벨 */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 1.5,
                    }}
                >
                    <Box>
                        <Typography
                            sx={{
                                fontSize: 12,
                                fontWeight: 800,
                                color: '#0ea5e9',
                                letterSpacing: '-0.01em',
                            }}
                        >
                            TODAY WEATHER
                        </Typography>

                        <Typography
                            sx={{
                                mt: 0.5,
                                fontSize: 22,
                                lineHeight: 1.2,
                                fontWeight: 900,
                                letterSpacing: '-0.03em',
                                color: '#0f172a',
                            }}
                        >
                            {locationText}
                        </Typography>

                        <Typography
                            sx={{
                                mt: 0.4,
                                fontSize: 13,
                                color: '#64748b',
                                fontWeight: 600,
                            }}
                        >
                            지금 이 순간의 날씨를 확인해보세요
                        </Typography>
                    </Box>

                    {!loading && !error && (
                        <Box
                            sx={{
                                px: 1.2,
                                py: 0.7,
                                borderRadius: '999px',
                                background: 'rgba(255,255,255,0.72)',
                                border: '1px solid rgba(255,255,255,0.88)',
                                boxShadow: '0 8px 20px rgba(148,163,184,0.12)',
                                fontSize: 11,
                                fontWeight: 800,
                                color: '#334155',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {weatherMeta.badgeText}
                        </Box>
                    )}
                </Box>

                {/* 메인 영역 */}
                <Box
                    sx={{
                        mt: 2.2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                    }}
                >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        {loading ? (
                            <>
                                <Skeleton variant="text" width={110} height={56} sx={{ borderRadius: 2 }} />
                                <Skeleton variant="text" width={150} height={26} sx={{ borderRadius: 2 }} />
                                <Skeleton variant="text" width={120} height={18} sx={{ borderRadius: 2, mt: 1 }} />
                            </>
                        ) : error ? (
                            <Typography
                                sx={{
                                    mt: 1,
                                    color: '#dc2626',
                                    fontSize: 14,
                                    fontWeight: 700,
                                }}
                            >
                                {error}
                            </Typography>
                        ) : (
                            <>
                                <Typography
                                    sx={{
                                        fontSize: { xs: 34, sm: 40 },
                                        fontWeight: 900,
                                        lineHeight: 1,
                                        letterSpacing: '-0.04em',
                                        color: '#0f172a',
                                    }}
                                >
                                    {temperature !== '-' ? `${temperature}°C` : '-'}
                                </Typography>

                                <Typography
                                    sx={{
                                        mt: 1,
                                        fontSize: 15,
                                        fontWeight: 700,
                                        color: '#334155',
                                        lineHeight: 1.45,
                                    }}
                                >
                                    {weatherText}
                                </Typography>

                                {(baseDate || baseTime) && (
                                    <Typography
                                        sx={{
                                            mt: 1,
                                            fontSize: 12,
                                            color: '#64748b',
                                            fontWeight: 600,
                                        }}
                                    >
                                        발표 시각 · {baseDate} {baseTime}
                                    </Typography>
                                )}
                            </>
                        )}
                    </Box>

                    {/* 아이콘 */}
                    <MotionBox
                        aria-label="weather-icon"
                        initial={false}
                        animate={loading ? { opacity: 0.9 } : { opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        sx={{
                            width: { xs: 96, sm: 112 },
                            height: { xs: 96, sm: 112 },
                            borderRadius: '28px',
                            display: 'grid',
                            placeItems: 'center',
                            background: weatherMeta.iconWrap,
                            border: '1px solid rgba(255,255,255,0.92)',
                            boxShadow: '0 14px 28px rgba(148,163,184,0.14)',
                            flexShrink: 0,
                        }}
                    >
                        {loading ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                            >
                                <CircularProgress size={26} sx={{ color: '#0ea5e9' }} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key={sky}
                                initial={{ opacity: 0, y: 8, scale: 0.94 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                                style={{ color: weatherMeta.iconColor }}
                            >
                                <motion.div
                                    animate={{ y: [0, -4, 0], rotate: [0, 1.5, -1.5, 0] }}
                                    transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                                >
                                    {weatherMeta.icon}
                                </motion.div>
                            </motion.div>
                        )}
                    </MotionBox>
                </Box>

                {/* 하단 작은 정보칩 */}
                {!loading && !error && (
                    <Box
                        sx={{
                            mt: 2.4,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                        }}
                    >
                        <Box
                            sx={{
                                px: 1.3,
                                py: 0.75,
                                borderRadius: '999px',
                                bgcolor: 'rgba(255,255,255,0.72)',
                                border: '1px solid rgba(255,255,255,0.92)',
                                color: '#0f172a',
                                fontSize: 12,
                                fontWeight: 700,
                                boxShadow: '0 8px 18px rgba(148,163,184,0.10)',
                            }}
                        >
                            {sky}
                        </Box>

                        <Box
                            sx={{
                                px: 1.3,
                                py: 0.75,
                                borderRadius: '999px',
                                bgcolor: 'rgba(255,255,255,0.60)',
                                border: '1px solid rgba(255,255,255,0.88)',
                                color: '#475569',
                                fontSize: 12,
                                fontWeight: 700,
                            }}
                        >
                            지역별 실시간 요약
                        </Box>
                    </Box>
                )}
            </CardContent>
        </MotionCard>
    );
}

export default WeatherCard;
