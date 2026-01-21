import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress, Chip, Divider } from '@mui/material';
import api from '../api/api';

function NewsCard() {
    const [newsTop10, setNewsTop10] = useState([]);
    const [trendTop5, setTrendTop5] = useState([]);
    const [sentimentSummary, setSentimentSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchNewsBrief = async () => {
            try {
                const res = await api.get('/news/brief');
                if (!mounted) return;

                const data = res.data || {};
                setNewsTop10(data.newsTop10 || []);
                setTrendTop5(data.trendTop5 || []);
                setSentimentSummary(data.sentimentSummary || null);
            } catch (err) {
                console.error('뉴스를 불러오지 못했습니다:', err);
                if (mounted) {
                    setNewsTop10([]);
                    setTrendTop5([]);
                    setSentimentSummary(null);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchNewsBrief();
        return () => {
            mounted = false;
        };
    }, []);

    // backend label: POSITIVE/NEGATIVE/NEUTRAL
    const getSentimentColor = (label) => {
        if (label === 'POSITIVE') return 'success';
        if (label === 'NEGATIVE') return 'error';
        return 'default';
    };

    const sentimentLabelToKorean = (label) => {
        if (label === 'POSITIVE') return '긍정';
        if (label === 'NEGATIVE') return '부정';
        return '중립';
    };

    // sizeLevel 1~5 → 배지 크기
    const trendSizeStyle = (sizeLevel) => {
        switch (sizeLevel) {
            case 5:
                return { fontSize: 16, fontWeight: 900, px: 1.8, py: 0.9 };
            case 4:
                return { fontSize: 14, fontWeight: 850, px: 1.6, py: 0.8 };
            case 3:
                return { fontSize: 13, fontWeight: 800, px: 1.4, py: 0.7 };
            case 2:
                return { fontSize: 12, fontWeight: 750, px: 1.25, py: 0.62 };
            default:
                return { fontSize: 11, fontWeight: 700, px: 1.1, py: 0.55 };
        }
    };

    const sentimentBar = useMemo(() => {
        if (!sentimentSummary || !sentimentSummary.total) return null;
        const total = sentimentSummary.total || 1;

        const posPct = Math.round((sentimentSummary.positiveCount / total) * 100);
        const negPct = Math.round((sentimentSummary.negativeCount / total) * 100);
        const neuPct = Math.max(0, 100 - posPct - negPct);

        return { posPct, negPct, neuPct };
    }, [sentimentSummary]);

    return (
        <Card
            sx={{
                borderRadius: 6,
                boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
                bgcolor: '#ffffff',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': { transform: 'scale(1.01)' },
                minHeight: 460,
            }}
        >
            <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                        오늘의 주요 뉴스
                    </Typography>

                    <Chip
                        label="LIVE TREND"
                        size="small"
                        sx={{
                            bgcolor: 'rgba(25,118,210,0.10)',
                            color: '#1976d2',
                            fontWeight: 900,
                            letterSpacing: 0.6,
                        }}
                    />
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
                        <CircularProgress size={42} sx={{ mb: 2 }} />
                        <Typography variant="body1" sx={{ color: '#666' }}>
                            뉴스를 불러오는 중입니다...
                        </Typography>
                    </Box>
                ) : (
                    <>
                        {/* ✅ Trend Top 5 (Top50 제목 기반) — 트렌디 UI (점수 제거, 순위만) */}
                        <Box
                            sx={{
                                borderRadius: 5,
                                p: 2.2,
                                bgcolor: 'rgba(0,0,0,0.02)',
                                border: '1px solid rgba(0,0,0,0.06)',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            {/* 은은한 배경 그라데이션 */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    background:
                                        'radial-gradient(600px 180px at 20% 0%, rgba(25,118,210,0.18), transparent 60%), radial-gradient(500px 160px at 90% 20%, rgba(76,175,80,0.14), transparent 55%)',
                                    pointerEvents: 'none',
                                }}
                            />

                            <Box sx={{ position: 'relative' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#222' }}>
                                        지금 뜨는 키워드
                                    </Typography>

                                    <Chip
                                        label="TOP 5"
                                        size="small"
                                        sx={{
                                            bgcolor: 'rgba(0,0,0,0.06)',
                                            fontWeight: 900,
                                            letterSpacing: 0.6,
                                        }}
                                    />
                                </Box>

                                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1.4 }}>
                                    트렌드 기준: 상위 50개 뉴스 제목
                                </Typography>

                                {/* 트렌드 배지 */}
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.1 }}>
                                    {trendTop5.length > 0 ? (
                                        trendTop5.map((t) => {
                                            const size = trendSizeStyle(t.sizeLevel);

                                            return (
                                                <Box
                                                    key={`${t.rank}-${t.keyword}`}
                                                    sx={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 1,
                                                        borderRadius: 999,
                                                        bgcolor: 'rgba(255,255,255,0.75)',
                                                        border: '1px solid rgba(0,0,0,0.08)',
                                                        boxShadow: '0 10px 24px rgba(0,0,0,0.06)',
                                                        backdropFilter: 'blur(6px)',
                                                        transition: 'transform 160ms ease, box-shadow 160ms ease',
                                                        '&:hover': {
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: '0 14px 30px rgba(0,0,0,0.10)',
                                                        },
                                                        ...size,
                                                    }}
                                                    title={`rank=${t.rank} (delta=${t.delta}, prev=${t.previousCount} → now=${t.currentCount})`}
                                                >
                                                    {/* 랭크 배지 */}
                                                    <Box
                                                        sx={{
                                                            width: 26,
                                                            height: 26,
                                                            borderRadius: 999,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: 12,
                                                            fontWeight: 900,
                                                            color: '#fff',
                                                            background:
                                                                t.rank === 1
                                                                    ? 'linear-gradient(135deg, #ffb300, #ff6f00)'
                                                                    : t.rank === 2
                                                                        ? 'linear-gradient(135deg, #90a4ae, #546e7a)'
                                                                        : t.rank === 3
                                                                            ? 'linear-gradient(135deg, #b26a00, #6d4c41)'
                                                                            : 'linear-gradient(135deg, #1976d2, #42a5f5)',
                                                            boxShadow: '0 10px 18px rgba(0,0,0,0.12)',
                                                            flex: '0 0 auto',
                                                        }}
                                                    >
                                                        {t.rank}
                                                    </Box>

                                                    {/* 키워드 */}
                                                    <Box
                                                        sx={{
                                                            color: '#1f2a37',
                                                            fontWeight: size.fontWeight,
                                                            fontSize: size.fontSize,
                                                            lineHeight: 1,
                                                            letterSpacing: '-0.2px',
                                                        }}
                                                    >
                                                        {t.keyword}
                                                    </Box>

                                                    {/* 방향 표시(점수 X, 랭크만 + 상승감) */}
                                                    <Box
                                                        sx={{
                                                            ml: 0.2,
                                                            fontSize: 12,
                                                            fontWeight: 900,
                                                            color: t.direction === 'UP' ? '#2e7d32' : t.direction === 'DOWN' ? '#d32f2f' : '#666',
                                                            opacity: 0.9,
                                                        }}
                                                    >
                                                        {t.direction === 'UP' ? '▲' : t.direction === 'DOWN' ? '▼' : '•'}
                                                    </Box>
                                                </Box>
                                            );
                                        })
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            트렌드 데이터가 없습니다.
                                        </Typography>
                                    )}
                                </Box>

                                {/* 감성 요약(Top10 기준) */}
                                {sentimentSummary && sentimentBar && (
                                    <Box sx={{ mt: 1.8 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
                                            <Typography variant="caption" sx={{ color: '#777', fontWeight: 800 }}>
                                                뉴스 분위기(Top10)
                                            </Typography>

                                            <Box sx={{ display: 'flex', gap: 0.8 }}>
                                                <Chip
                                                    size="small"
                                                    label={`긍정 ${sentimentSummary.positiveCount}`}
                                                    color="success"
                                                    sx={{ fontWeight: 900 }}
                                                />
                                                <Chip
                                                    size="small"
                                                    label={`부정 ${sentimentSummary.negativeCount}`}
                                                    color="error"
                                                    sx={{ fontWeight: 900 }}
                                                />
                                                <Chip
                                                    size="small"
                                                    label={`중립 ${sentimentSummary.neutralCount}`}
                                                    sx={{ fontWeight: 900 }}
                                                />
                                            </Box>
                                        </Box>

                                        <Box
                                            sx={{
                                                display: 'flex',
                                                width: '100%',
                                                height: 10,
                                                borderRadius: 999,
                                                overflow: 'hidden',
                                                bgcolor: 'rgba(0,0,0,0.06)',
                                            }}
                                        >
                                            <Box sx={{ width: `${sentimentBar.posPct}%`, bgcolor: '#2e7d32' }} />
                                            <Box sx={{ width: `${sentimentBar.neuPct}%`, bgcolor: '#9e9e9e' }} />
                                            <Box sx={{ width: `${sentimentBar.negPct}%`, bgcolor: '#d32f2f' }} />
                                        </Box>

                                        <Typography variant="caption" sx={{ color: '#777', display: 'block', mt: 0.8 }}>
                                            평균 점수: {Math.round((sentimentSummary.averageScore || 0) * 100)} / 100
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        <Divider sx={{ my: 0.5 }} />

                        {/* ✅ News Top10 리스트 (표시 + 감성 칩) */}
                        {newsTop10.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                                {newsTop10.map((news) => (
                                    <Box
                                        key={news.rank}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            p: 1.5,
                                            borderRadius: 3,
                                            backgroundColor: 'rgba(0,0,0,0.02)',
                                            '&:hover': { backgroundColor: 'rgba(0,0,0,0.05)' },
                                            transition: '0.2s',
                                            gap: 1.5,
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flex: 1, minWidth: 0 }}>
                                            <Box
                                                sx={{
                                                    width: 26,
                                                    height: 26,
                                                    borderRadius: 999,
                                                    bgcolor: 'rgba(0,0,0,0.06)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 900,
                                                    color: '#333',
                                                    flex: '0 0 auto',
                                                }}
                                            >
                                                {news.rank}
                                            </Box>

                                            <Typography
                                                variant="body1"
                                                component="a"
                                                href={news.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{
                                                    textDecoration: 'none',
                                                    color: '#333',
                                                    fontWeight: 700,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    flex: 1,
                                                    '&:hover': { color: '#1976d2' },
                                                }}
                                            >
                                                {news.title}
                                            </Typography>
                                        </Box>

                                        <Chip
                                            label={sentimentLabelToKorean(news.sentimentLabel)}
                                            color={getSentimentColor(news.sentimentLabel)}
                                            size="small"
                                            sx={{ fontWeight: 900 }}
                                            title={`score=${Math.round((news.sentimentScore || 0) * 100)} / 100`}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Typography textAlign="center" color="text.secondary" sx={{ py: 4 }}>
                                현재 표시할 뉴스가 없습니다.
                            </Typography>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

export default NewsCard;
