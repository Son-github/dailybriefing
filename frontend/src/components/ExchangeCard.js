import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress, Skeleton } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { motion } from 'framer-motion';
import api from '../api/api';

const MotionCard = motion(Card);
const MotionBox = motion(Box);

function ExchangeCard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [animatedRate, setAnimatedRate] = useState(0);

    useEffect(() => {
        let mounted = true;

        const fetchExchangeRate = async () => {
            try {
                const res = await api.get('/exchange');
                if (mounted) setData(res.data);
            } catch (error) {
                console.error('환율 정보를 불러오지 못했습니다:', error);
                if (mounted) setData(null);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchExchangeRate();

        return () => {
            mounted = false;
        };
    }, []);

    // ✅ 카운트업 애니메이션 (부드럽게 + 마지막에 정확히 end로 스냅)
    useEffect(() => {
        if (!data?.rate) return;

        const end = Number(data.rate);
        if (!Number.isFinite(end)) return;

        const duration = 900; // ms
        const startTime = performance.now();
        const startValue = 0;

        let rafId = 0;

        const animate = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);

            // easeOutCubic
            const eased = 1 - Math.pow(1 - t, 3);
            const next = Math.round(startValue + (end - startValue) * eased);

            setAnimatedRate(next);

            if (t < 1) rafId = requestAnimationFrame(animate);
            else setAnimatedRate(end); // 마지막 값 보정
        };

        rafId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafId);
    }, [data]);

    const accent = '#22c55e'; // 최신 UI에서 많이 쓰는 깔끔한 그린 톤(너 카드 톤과도 잘 맞음)

    const rateText = useMemo(() => {
        if (!data?.rate) return '-';
        return animatedRate.toLocaleString();
    }, [animatedRate, data]);

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
                bgcolor: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.6)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            }}
        >
            {/* subtle gradient glow */}
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
                {/* 아이콘 배지 */}
                <MotionBox
                    sx={{
                        width: 88,
                        height: 88,
                        borderRadius: 999,
                        display: 'grid',
                        placeItems: 'center',
                        mb: 2,
                        background: `linear-gradient(180deg, ${accent}22, rgba(255,255,255,0.35))`,
                        border: '1px solid rgba(255,255,255,0.6)',
                        boxShadow: '0 10px 24px rgba(0,0,0,0.06)',
                    }}
                    animate={loading ? { opacity: 0.9 } : { opacity: 1 }}
                    transition={{ duration: 0.2 }}
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
                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                            style={{ color: accent }}
                        >
                            <motion.div
                                animate={{ y: [0, -3, 0] }}
                                transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
                            >
                                <MonetizationOnIcon sx={{ fontSize: 56 }} />
                            </motion.div>
                        </motion.div>
                    )}
                </MotionBox>

                <Typography
                    variant="h6"
                    fontWeight="800"
                    sx={{ mb: 1, color: '#111827', letterSpacing: '-0.01em' }}
                >
                    오늘의 환율
                </Typography>

                {loading ? (
                    <>
                        <Skeleton variant="text" width={160} height={54} sx={{ borderRadius: 2 }} />
                        <Skeleton variant="text" width={120} height={24} sx={{ borderRadius: 2 }} />
                    </>
                ) : data ? (
                    <>
                        {/* 숫자 영역: 변경될 때 살짝 팝 */}
                        <motion.div
                            key={rateText}
                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                        >
                            <Typography
                                variant="h3"
                                fontWeight="900"
                                sx={{
                                    mt: 0.5,
                                    color: '#1f2937',
                                    lineHeight: 1.1,
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                {rateText}{' '}
                                <Typography component="span" variant="h5" sx={{ fontWeight: 800 }}>
                                    원
                                </Typography>
                            </Typography>
                        </motion.div>

                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            기준일: {data.fetchedDate}
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
                            USD/KRW 기준
                        </Box>
                    </>
                ) : (
                    <Typography color="error" sx={{ textAlign: 'center', py: 2 }}>
                        환율 정보를 불러오지 못했습니다.
                    </Typography>
                )}
            </CardContent>
        </MotionCard>
    );
}

export default ExchangeCard;
