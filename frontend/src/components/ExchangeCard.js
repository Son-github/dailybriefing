import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Typography, Box, Skeleton, Chip } from '@mui/material';
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded';
import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import RemoveIcon from '@mui/icons-material/Remove';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { motion } from 'framer-motion';
import api from '../api/api';

const MotionCard = motion.create(Card);

function formatRelativeTimeKorean(isoOrDateTimeString) {
    if (!isoOrDateTimeString) return null;

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

function toNumberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function formatValue(value, digits = 1) {
    const num = toNumberOrNull(value);
    if (num === null) return '-';
    return num.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
}

function formatPercent(value, digits = 2) {
    const num = toNumberOrNull(value);
    if (num === null) return '-';
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(digits)}%`;
}

function getTrend(delta) {
    const num = toNumberOrNull(delta);
    if (num === null) return 'flat';
    if (num > 0) return 'up';
    if (num < 0) return 'down';
    return 'flat';
}

function getTrendColor(trend) {
    if (trend === 'up') return '#ef4444';
    if (trend === 'down') return '#2563eb';
    return '#64748b';
}

function getTrendBg(trend) {
    if (trend === 'up') return 'rgba(239,68,68,0.08)';
    if (trend === 'down') return 'rgba(37,99,235,0.08)';
    return 'rgba(100,116,139,0.08)';
}

function getTrendIcon(trend) {
    if (trend === 'up') return <ArrowDropUpIcon sx={{ fontSize: 20 }} />;
    if (trend === 'down') return <ArrowDropDownIcon sx={{ fontSize: 20 }} />;
    return <RemoveIcon sx={{ fontSize: 15 }} />;
}

function MarketMiniCard({ item, index }) {
    const trend = getTrend(item.changeRate);
    const trendColor = getTrendColor(trend);
    const hasChange = toNumberOrNull(item.changeRate) !== null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * index, duration: 0.28 }}
            whileHover={{ y: -2 }}
        >
            <Box
                sx={{
                    p: 1.6,
                    borderRadius: '24px',
                    background: 'rgba(255,255,255,0.76)',
                    border: '1px solid rgba(255,255,255,0.94)',
                    boxShadow: '0 10px 24px rgba(148,163,184,0.10)',
                    minHeight: 126,
                    transition: 'all 0.18s ease',
                    '&:hover': {
                        boxShadow: '0 14px 28px rgba(148,163,184,0.16)',
                    },
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                    }}
                >
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '14px',
                            display: 'grid',
                            placeItems: 'center',
                            background: item.iconWrap,
                            color: item.iconColor,
                            border: '1px solid rgba(255,255,255,0.92)',
                            boxShadow: '0 8px 18px rgba(148,163,184,0.10)',
                            flexShrink: 0,
                        }}
                    >
                        {item.icon}
                    </Box>

                    <Box
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.15,
                            px: 0.9,
                            py: 0.45,
                            borderRadius: '999px',
                            bgcolor: hasChange ? getTrendBg(trend) : 'rgba(100,116,139,0.08)',
                            border: '1px solid rgba(255,255,255,0.92)',
                            color: trendColor,
                            fontSize: 11,
                            fontWeight: 800,
                            boxShadow: '0 6px 14px rgba(148,163,184,0.08)',
                            minWidth: 66,
                            justifyContent: 'center',
                        }}
                    >
                        {getTrendIcon(trend)}
                        {formatPercent(item.changeRate)}
                    </Box>
                </Box>

                <Typography
                    sx={{
                        mt: 1.45,
                        fontSize: 11.5,
                        fontWeight: 800,
                        color: '#64748b',
                        letterSpacing: '-0.01em',
                    }}
                >
                    {item.label}
                </Typography>

                <Typography
                    sx={{
                        mt: 0.55,
                        fontSize: { xs: 20, sm: 22 },
                        fontWeight: 900,
                        lineHeight: 1.1,
                        letterSpacing: '-0.035em',
                        color: '#0f172a',
                        wordBreak: 'break-word',
                    }}
                >
                    {item.formattedValue}
                </Typography>

                <Typography
                    sx={{
                        mt: 0.85,
                        fontSize: 11.5,
                        color: hasChange ? trendColor : '#94a3b8',
                        fontWeight: 700,
                        lineHeight: 1.35,
                    }}
                >
                    {item.subText}
                </Typography>
            </Box>
        </motion.div>
    );
}

function ExchangeCard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchMarketSummary = async () => {
            try {
                setLoading(true);

                try {
                    const res = await api.get('/exchange');
                    if (!mounted) return;
                    setData(res.data || null);
                } catch (marketErr) {
                    console.warn('/market/summary 없음. 기존 /exchange fallback 사용', marketErr);

                    const res = await api.get('/exchange');
                    if (!mounted) return;

                    setData({
                        usdKrw: res.data?.rate ?? null,
                        usdKrwChangeRate: res.data?.deltaFromLastSeen ?? res.data?.delta ?? null,
                        kospi: null,
                        kospiChangeRate: null,
                        kosdaq: null,
                        kosdaqChangeRate: null,
                        nasdaq: null,
                        nasdaqChangeRate: null,
                        updatedAt: res.data?.lastSeenAt ?? null,
                        fetchedDate: res.data?.fetchedDate ?? null,
                    });
                }
            } catch (error) {
                console.error('시장 정보를 불러오지 못했습니다:', error);
                if (mounted) setData(null);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchMarketSummary();
        return () => {
            mounted = false;
        };
    }, []);

    const lastSeenText = useMemo(() => {
        return formatRelativeTimeKorean(data?.updatedAt);
    }, [data?.updatedAt]);

    const marketItems = useMemo(() => {
        return [
            {
                key: 'usdkrw',
                label: 'USD / KRW',
                icon: <MonetizationOnRoundedIcon sx={{ fontSize: 22 }} />,
                iconColor: '#16a34a',
                iconWrap: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,253,244,0.95) 100%)',
                formattedValue: formatValue(data?.usdKrw, 1),
                changeRate: data?.usdKrwChangeRate,
                subText:
                    toNumberOrNull(data?.usdKrwChangeRate) === null
                        ? '환율 데이터 준비 중'
                        : `변동률 ${formatPercent(data?.usdKrwChangeRate)}`,
            },
            {
                key: 'kospi',
                label: 'KOSPI',
                icon: <ShowChartRoundedIcon sx={{ fontSize: 22 }} />,
                iconColor: '#2563eb',
                iconWrap: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.95) 100%)',
                formattedValue: formatValue(data?.kospi, 2),
                changeRate: data?.kospiChangeRate,
                subText:
                    toNumberOrNull(data?.kospiChangeRate) === null
                        ? '지수 데이터 준비 중'
                        : `변동률 ${formatPercent(data?.kospiChangeRate)}`,
            },
            {
                key: 'kosdaq',
                label: 'KOSDAQ',
                icon: <TrendingUpRoundedIcon sx={{ fontSize: 22 }} />,
                iconColor: '#7c3aed',
                iconWrap: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,243,255,0.95) 100%)',
                formattedValue: formatValue(data?.kosdaq, 2),
                changeRate: data?.kosdaqChangeRate,
                subText:
                    toNumberOrNull(data?.kosdaqChangeRate) === null
                        ? '지수 데이터 준비 중'
                        : `변동률 ${formatPercent(data?.kosdaqChangeRate)}`,
            },
            {
                key: 'nasdaq',
                label: 'NASDAQ',
                icon: <InsightsRoundedIcon sx={{ fontSize: 22 }} />,
                iconColor: '#f59e0b',
                iconWrap: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,251,235,0.95) 100%)',
                formattedValue: formatValue(data?.nasdaq, 2),
                changeRate: data?.nasdaqChangeRate,
                subText:
                    toNumberOrNull(data?.nasdaqChangeRate) === null
                        ? '지수 데이터 준비 중'
                        : `변동률 ${formatPercent(data?.nasdaqChangeRate)}`,
            },
        ];
    }, [data]);

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
                background: 'linear-gradient(135deg, #f8fffb 0%, #f3fbff 52%, #f8fbff 100%)',
                border: '1px solid rgba(255,255,255,0.92)',
                boxShadow: '0 16px 40px rgba(148,163,184,0.16)',
                backdropFilter: 'blur(12px)',
            }}
        >
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
                        top: -46,
                        right: -16,
                        width: 170,
                        height: 170,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(74,222,128,0.42) 0%, rgba(74,222,128,0.12) 48%, rgba(74,222,128,0) 72%)',
                        filter: 'blur(4px)',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -56,
                        left: -20,
                        width: 150,
                        height: 150,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(96,165,250,0.30) 0%, rgba(96,165,250,0.10) 48%, rgba(96,165,250,0) 72%)',
                    }}
                />
            </Box>

            <CardContent
                sx={{
                    p: { xs: 2.3, sm: 3 },
                    position: 'relative',
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        mb: 2.2,
                    }}
                >
                    <Box>
                        <Typography
                            sx={{
                                fontSize: 12,
                                fontWeight: 800,
                                color: '#0f766e',
                                letterSpacing: '-0.01em',
                            }}
                        >
                            TODAY MARKET
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
                            환율 & 시장 요약
                        </Typography>

                        <Typography
                            sx={{
                                mt: 0.4,
                                fontSize: 13,
                                color: '#64748b',
                                fontWeight: 600,
                            }}
                        >
                            한 번에 주요 금융 지표를 확인해보세요
                        </Typography>
                    </Box>

                    {!loading && (
                        <Chip
                            icon={<AutoAwesomeRoundedIcon sx={{ fontSize: '16px !important' }} />}
                            label="Market Live"
                            size="small"
                            sx={{
                                height: 32,
                                bgcolor: 'rgba(15,118,110,0.08)',
                                color: '#0f766e',
                                fontWeight: 900,
                                borderRadius: '999px',
                                border: '1px solid rgba(15,118,110,0.12)',
                                '& .MuiChip-label': {
                                    px: 1.1,
                                    letterSpacing: '-0.01em',
                                },
                            }}
                        />
                    )}
                </Box>

                {loading ? (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: 1.3,
                        }}
                    >
                        {[...Array(4)].map((_, idx) => (
                            <Skeleton
                                key={idx}
                                variant="rounded"
                                height={126}
                                sx={{ borderRadius: '24px' }}
                            />
                        ))}
                    </Box>
                ) : data ? (
                    <>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                gap: 1.3,
                            }}
                        >
                            {marketItems.map((item, idx) => (
                                <MarketMiniCard key={item.key} item={item} index={idx} />
                            ))}
                        </Box>

                        <Box
                            sx={{
                                mt: 2.15,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1,
                                flexWrap: 'wrap',
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
                                {data?.fetchedDate ? `기준일 · ${data.fetchedDate}` : '기준일 · -'}
                            </Box>

                            <Typography
                                sx={{
                                    fontSize: 12,
                                    color: '#64748b',
                                    fontWeight: 600,
                                }}
                            >
                                {lastSeenText ? `마지막 갱신 · ${lastSeenText}` : '마지막 갱신 · -'}
                            </Typography>
                        </Box>
                    </>
                ) : (
                    <Typography
                        sx={{
                            textAlign: 'left',
                            py: 2,
                            color: '#dc2626',
                            fontSize: 14,
                            fontWeight: 700,
                        }}
                    >
                        시장 정보를 불러오지 못했습니다.
                    </Typography>
                )}
            </CardContent>
        </MotionCard>
    );
}

export default ExchangeCard;
