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
    const [sky, setSky] = useState('-'); // "맑음/구름많음/흐림/비/눈/소나기"
    const [baseDate, setBaseDate] = useState('');
    const [baseTime, setBaseTime] = useState('');
    const [error, setError] = useState('');

    // 🎨 카드 톤(블루 계열)
    const accent = '#3b82f6';

    const locationText = useMemo(() => REGION_LABEL[region] || '서울', [region]);

    const iconEl = useMemo(() => {
        if (!sky || sky === '-') return <CloudQueueRoundedIcon sx={{ fontSize: 56 }} />;

        // PTY 우선 처리 결과가 sky에 들어올 수 있음: "비/눈/소나기"
        if (sky.includes('소나기')) return <ThunderstormRoundedIcon sx={{ fontSize: 56 }} />;
        if (sky.includes('비/눈')) return <UmbrellaRoundedIcon sx={{ fontSize: 56 }} />;
        if (sky.includes('비')) return <UmbrellaRoundedIcon sx={{ fontSize: 56 }} />;
        if (sky.includes('눈')) return <AcUnitRoundedIcon sx={{ fontSize: 56 }} />;

        // SKY 기반
        if (sky.includes('맑음')) return <WbSunnyRoundedIcon sx={{ fontSize: 56 }} />;
        if (sky.includes('구름')) return <CloudRoundedIcon sx={{ fontSize: 56 }} />;
        if (sky.includes('흐림')) return <CloudQueueRoundedIcon sx={{ fontSize: 56 }} />;

        return <CloudQueueRoundedIcon sx={{ fontSize: 56 }} />;
    }, [sky]);

    const weatherText = useMemo(() => {
        if (sky === '-' || temperature === '-') return '데이터를 불러오는 중';
        return `${sky} · 체감은 개인차가 있어요`;
    }, [sky, temperature]);

    useEffect(() => {
        let mounted = true;

        const fetchWeather = async () => {
            try {
                setLoading(true);
                setError('');

                // ✅ 마이페이지에서 저장한 지역(없으면 SEOUL)
                const stored = localStorage.getItem('weatherRegion') || 'SEOUL';
                const normalized = (stored || 'SEOUL').toUpperCase();
                if (mounted) setRegion(normalized);

                // ✅ 지역 파라미터로 호출
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
                borderRadius: 6,
                overflow: 'hidden',
                position: 'relative',
                bgcolor: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.6)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            }}
        >
            {/* subtle gradient top glow */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(600px circle at 50% 0%, ${accent}22, transparent 55%)`,
                    pointerEvents: 'none',
                }}
            />

            <CardContent
                sx={{
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    position: 'relative',
                }}
            >
                {/* 위치 */}
                <Typography
                    variant="body2"
                    sx={{
                        mb: 1,
                        color: 'text.secondary',
                        letterSpacing: '0.02em',
                    }}
                >
                    {locationText} 날씨
                </Typography>

                {/* 아이콘 영역 */}
                <MotionBox
                    aria-label="weather-icon"
                    initial={false}
                    animate={loading ? { opacity: 0.9 } : { opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    sx={{
                        my: 2,
                        width: 88,
                        height: 88,
                        borderRadius: 999,
                        display: 'grid',
                        placeItems: 'center',
                        background: `linear-gradient(180deg, ${accent}22, rgba(255,255,255,0.35))`,
                        border: '1px solid rgba(255,255,255,0.6)',
                        boxShadow: '0 10px 24px rgba(0,0,0,0.06)',
                    }}
                >
                    {loading ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
                            <CircularProgress size={26} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key={sky}
                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                            style={{ color: accent }}
                        >
                            <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}>
                                {iconEl}
                            </motion.div>
                        </motion.div>
                    )}
                </MotionBox>

                {/* 온도 & 설명 */}
                {loading ? (
                    <>
                        <Skeleton variant="text" width={110} height={54} sx={{ borderRadius: 2 }} />
                        <Skeleton variant="text" width={90} height={24} sx={{ borderRadius: 2 }} />
                    </>
                ) : error ? (
                    <Typography color="error" sx={{ mt: 1 }}>
                        {error}
                    </Typography>
                ) : (
                    <>
                        <Typography
                            variant="h3"
                            fontWeight="800"
                            sx={{
                                mt: 0.5,
                                color: '#1f2937',
                                lineHeight: 1.1,
                                letterSpacing: '-0.02em',
                            }}
                        >
                            {temperature !== '-' ? `${temperature}°C` : '-'}
                        </Typography>

                        <Typography
                            variant="body1"
                            sx={{
                                mt: 1,
                                color: 'text.secondary',
                            }}
                        >
                            {weatherText}
                        </Typography>

                        {/* 발표시각(작게) */}
                        {(baseDate || baseTime) && (
                            <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
                                발표: {baseDate} {baseTime}
                            </Typography>
                        )}

                        {/* micro badge */}
                        <Box
                            sx={{
                                mt: 2,
                                px: 1.2,
                                py: 0.5,
                                fontSize: 12,
                                borderRadius: 999,
                                color: '#111827',
                                background: 'rgba(255,255,255,0.65)',
                                border: '1px solid rgba(255,255,255,0.7)',
                                boxShadow: '0 8px 18px rgba(0,0,0,0.06)',
                            }}
                        >
                            지역별 실시간 요약
                        </Box>
                    </>
                )}
            </CardContent>
        </MotionCard>
    );
}

export default WeatherCard;
