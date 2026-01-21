import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Typography, CircularProgress, Box, Skeleton } from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CloudIcon from '@mui/icons-material/Cloud';
import GrainIcon from '@mui/icons-material/Grain';
import { motion } from 'framer-motion';
import api from '../api/api';

const MotionCard = motion(Card);
const MotionBox = motion(Box);

function WeatherCard() {
    const location = '서울';
    const [temperature, setTemperature] = useState(null);
    const [weatherText, setWeatherText] = useState('');
    const [sky, setSky] = useState('맑음');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchWeather = async () => {
            try {
                const res = await api.get('/weather/summary');
                if (!mounted) return;

                const data = res.data;
                const nextTemp = data?.temperature ?? '-';
                const nextSky = data?.sky ?? '알 수 없음';

                setTemperature(nextTemp);
                setWeatherText(nextSky);
                setSky(nextSky);
            } catch (err) {
                console.error('날씨 정보를 불러오지 못했습니다:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchWeather();
        return () => {
            mounted = false;
        };
    }, []);

    const { iconEl, accent } = useMemo(() => {
        switch (sky) {
            case '맑음':
                return { iconEl: <WbSunnyIcon sx={{ fontSize: 56 }} />, accent: '#FFA726' };
            case '구름많음':
                return { iconEl: <CloudIcon sx={{ fontSize: 56 }} />, accent: '#90A4AE' };
            case '흐림':
                return { iconEl: <CloudIcon sx={{ fontSize: 56 }} />, accent: '#607D8B' };
            case '비':
                return { iconEl: <GrainIcon sx={{ fontSize: 56 }} />, accent: '#42A5F5' };
            default:
                return { iconEl: <WbSunnyIcon sx={{ fontSize: 56 }} />, accent: '#FFA726' };
        }
    }, [sky]);

    return (
        <MotionCard
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
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
                    {location} 날씨
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
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                        >
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
                            {/* 살짝 둥실둥실 떠있는 미세 모션 */}
                            <motion.div
                                animate={{ y: [0, -3, 0] }}
                                transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                            >
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
                            실시간 요약
                        </Box>
                    </>
                )}
            </CardContent>
        </MotionCard>
    );
}

export default WeatherCard;
