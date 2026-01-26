import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import RemoveIcon from '@mui/icons-material/Remove';
import { motion } from 'framer-motion';
import api from '../api/api';

// ✅ framer-motion 최신 권장 방식(경고 제거)
const MotionCard = motion.create(Card);
const MotionBox = motion.create(Box);

function formatRelativeTimeKorean(isoOrDateTimeString) {
    if (!isoOrDateTimeString) return null;

    // LocalDateTime("2026-01-22T09:40:10")도 Date로 파싱 가능(브라우저에 따라 약간 다름)
    const t = new Date(isoOrDateTimeString);
    if (Number.isNaN(t.getTime())) return null;

    const now = new Date();
    const diffMs = now.getTime() - t.getTime();

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 10) return '방금 전';
    if (diffSec < 60) return `${diffSec}초 전`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}분 전`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;

    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}일 전`;
}

function ExchangeCard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // ✅ 실시간 느낌: 이전 rate에서 새 rate로 카운트업
    const prevRateRef = useRef(null);
    const [animatedRate, setAnimatedRate] = useState(0);

    // 🎨 카드 톤(그린 계열)
    const accent = '#22c55e';

    useEffect(() => {
        let mounted = true;

        const fetchExchangeRate = async () => {
            try {
                // ✅ 기존 엔드포인트 유지
                // 백엔드가 userId 필요하면(마지막 조회 대비) 컨트롤러에서 토큰/헤더로 받도록 되어있어야 함
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

    // ✅ delta 필드명 호환 처리:
    // - deltaFromLastSeen (예전)
    // - delta (개선된 DTO)
    const delta = useMemo(() => {
        if (!data) return null;
        const raw = data.deltaFromLastSeen ?? data.delta ?? null;
        if (raw === null || raw === undefined) return null;
        const num = Number(raw);
        return Number.isFinite(num) ? num : null;
    }, [data]);

    const trend = useMemo(() => {
        if (delta === null) return 'none';
        if (delta > 0) return 'up';
        if (delta < 0) return 'down';
        return 'flat';
    }, [delta]);

    const deltaLabel = useMemo(() => {
        if (delta === null) return '첫 확인';
        const abs = Math.abs(delta);
        const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
        return `${sign}${abs.toFixed(1)}원`;
    }, [delta]);

    const deltaColor = useMemo(() => {
        if (delta === null) return 'rgba(17, 24, 39, 0.75)';
        if (delta > 0) return '#ef4444'; // 상승: 빨강
        if (delta < 0) return '#3b82f6'; // 하락: 파랑
        return 'rgba(17, 24, 39, 0.75)';
    }, [delta]);

    const deltaIcon = useMemo(() => {
        if (delta === null) return <RemoveIcon sx={{ fontSize: 18 }} />;
        if (delta > 0) return <ArrowDropUpIcon sx={{ fontSize: 22 }} />;
        if (delta < 0) return <ArrowDropDownIcon sx={{ fontSize: 22 }} />;
        return <RemoveIcon sx={{ fontSize: 18 }} />;
    }, [delta]);

    const lastSeenText = useMemo(() => {
        const raw = data?.lastSeenAt; // 백엔드: LocalDateTime
        return formatRelativeTimeKorean(raw);
    }, [data?.lastSeenAt]);

    // ✅ 숫자 카운트업: "이전값 -> 현재값"
    useEffect(() => {
        const end = Number(data?.rate);
        if (!Number.isFinite(end)) return;

        const prev = prevRateRef.current;
        const startValue = Number.isFinite(prev) ? prev : 0;

        // 첫 렌더 시에도 깔끔하게
        if (!Number.isFinite(prev)) setAnimatedRate(Number(startValue.toFixed(1)));

        const duration = 800;
        const startTime = performance.now();
        let rafId = 0;

        const animate = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);

            // easeOutCubic
            const eased = 1 - Math.pow(1 - t, 3);
            const next = startValue + (end - startValue) * eased;

            setAnimatedRate(Number(next.toFixed(1)));

            if (t < 1) rafId = requestAnimationFrame(animate);
            else {
                setAnimatedRate(Number(end.toFixed(1)));
                prevRateRef.current = end;
            }
        };

        rafId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafId);
    }, [data?.rate]);

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
                >
                    {loading ? (
                        <Skeleton variant="circular" width={40} height={40} />
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                            style={{ color: accent }}
                        >
                            <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}>
                                <MonetizationOnIcon sx={{ fontSize: 56 }} />
                            </motion.div>
                        </motion.div>
                    )}
                </MotionBox>

                <Typography variant="h6" fontWeight="800" sx={{ mb: 1, color: '#111827', letterSpacing: '-0.01em' }}>
                    오늘의 환율 (USD/KRW)
                </Typography>

                {loading ? (
                    <>
                        <Skeleton variant="text" width={180} height={54} sx={{ borderRadius: 2 }} />
                        <Skeleton variant="text" width={140} height={22} sx={{ borderRadius: 2 }} />
                        <Skeleton variant="rounded" width={160} height={28} sx={{ mt: 2, borderRadius: 999 }} />
                    </>
                ) : data ? (
                    <>
                        {/* 숫자: 변경될 때 살짝 팝 */}
                        <motion.div
                            key={String(data?.rate)}
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
                                {animatedRate.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                                <Typography component="span" variant="h5" sx={{ fontWeight: 800 }}>
                                    원
                                </Typography>
                            </Typography>
                        </motion.div>

                        {/* 기준일 */}
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            기준일: {data.fetchedDate}
                        </Typography>

                        {/* last seen 대비 배지 */}
                        <Box
                            sx={{
                                mt: 2,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.6,
                                px: 1.2,
                                py: 0.6,
                                borderRadius: 999,
                                border: '1px solid rgba(255,255,255,0.7)',
                                background: 'rgba(255,255,255,0.65)',
                                boxShadow: '0 8px 18px rgba(0,0,0,0.06)',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', color: deltaColor }}>{deltaIcon}</Box>

                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 800,
                                    color: deltaColor,
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                {deltaLabel}
                            </Typography>

                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                {delta === null ? '(기준 생성)' : '(마지막 확인 대비)'}
                            </Typography>
                        </Box>

                        {/* 마지막 확인 시각 */}
                        <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
                            {lastSeenText ? `마지막 확인: ${lastSeenText}` : '마지막 확인: -'}
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
                            {trend === 'up'
                                ? '상승 흐름'
                                : trend === 'down'
                                    ? '하락 흐름'
                                    : trend === 'flat'
                                        ? '변동 없음'
                                        : '개인 기준 생성'}
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
