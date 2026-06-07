import React, { useEffect, useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    CircularProgress,
    Chip,
    Skeleton,
    IconButton,
    Tooltip,
} from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import { motion } from 'framer-motion';
import api from '../api/api';

const MotionCard = motion.create(Card);
const MotionBox = motion.create(Box);

function rankGradient(rank) {
    if (rank === 1) return 'linear-gradient(135deg, #f59e0b, #fb7185)';
    if (rank === 2) return 'linear-gradient(135deg, #94a3b8, #64748b)';
    if (rank === 3) return 'linear-gradient(135deg, #c08457, #8b5e3c)';
    return 'linear-gradient(135deg, #38bdf8, #6366f1)';
}

function rankLabel(rank) {
    if (rank === 1) return 'HOT';
    if (rank === 2) return 'TREND';
    if (rank === 3) return 'TOPIC';
    return 'NEWS';
}

function NewsCard() {
    const [newsTop10, setNewsTop10] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reloadTick, setReloadTick] = useState(0);

    useEffect(() => {
        let mounted = true;

        const fetchTop10 = async () => {
            try {
                setLoading(true);
                const res = await api.get('/news/brief');
                if (!mounted) return;

                const data = res.data || {};
                setNewsTop10(data.newsTop10 || []);
            } catch (err) {
                console.error('뉴스를 불러오지 못했습니다:', err);
                if (mounted) setNewsTop10([]);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchTop10();
        return () => {
            mounted = false;
        };
    }, [reloadTick]);

    const onReload = () => setReloadTick((t) => t + 1);

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
                background: 'linear-gradient(135deg, #fcfdff 0%, #f5f9ff 52%, #f8fbff 100%)',
                border: '1px solid rgba(255,255,255,0.92)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 16px 40px rgba(148,163,184,0.16)',
                minHeight: 420,
            }}
        >
            {/* background accents */}
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
                        right: -12,
                        width: 170,
                        height: 170,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(96,165,250,0.40) 0%, rgba(96,165,250,0.12) 48%, rgba(96,165,250,0) 72%)',
                        filter: 'blur(4px)',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -54,
                        left: -16,
                        width: 150,
                        height: 150,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(165,180,252,0.34) 0%, rgba(165,180,252,0.10) 48%, rgba(165,180,252,0) 72%)',
                    }}
                />
            </Box>

            <CardContent
                sx={{
                    p: { xs: 2.3, sm: 3 },
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2.1,
                    position: 'relative',
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 1.2,
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            sx={{
                                fontSize: 12,
                                fontWeight: 800,
                                color: '#2563eb',
                                letterSpacing: '-0.01em',
                            }}
                        >
                            TODAY NEWS
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
                            News Briefing Top 10
                        </Typography>

                        <Typography
                            sx={{
                                mt: 0.4,
                                fontSize: 13,
                                color: '#64748b',
                                fontWeight: 600,
                            }}
                        >
                            오늘 많이 보는 주요 이슈를 빠르게 확인해보세요
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                            label="TOP 10"
                            size="small"
                            sx={{
                                height: 32,
                                bgcolor: 'rgba(59,130,246,0.10)',
                                color: '#2563eb',
                                fontWeight: 900,
                                borderRadius: '999px',
                                border: '1px solid rgba(59,130,246,0.16)',
                                '& .MuiChip-label': {
                                    px: 1.2,
                                    letterSpacing: '-0.01em',
                                },
                            }}
                        />

                        <Tooltip title="새로고침">
                            <IconButton
                                onClick={onReload}
                                sx={{
                                    width: 36,
                                    height: 36,
                                    bgcolor: 'rgba(255,255,255,0.74)',
                                    border: '1px solid rgba(255,255,255,0.9)',
                                    boxShadow: '0 8px 18px rgba(148,163,184,0.10)',
                                    color: '#334155',
                                    '&:hover': {
                                        bgcolor: 'rgba(255,255,255,0.92)',
                                    },
                                }}
                            >
                                <motion.div
                                    animate={loading ? { rotate: 360 } : { rotate: 0 }}
                                    transition={
                                        loading
                                            ? { repeat: Infinity, duration: 0.9, ease: 'linear' }
                                            : { duration: 0.2 }
                                    }
                                >
                                    <RefreshIcon fontSize="small" />
                                </motion.div>
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Body */}
                {loading ? (
                    <Box sx={{ py: 0.6 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                            {[...Array(6)].map((_, idx) => (
                                <Skeleton
                                    key={idx}
                                    variant="rounded"
                                    height={78}
                                    sx={{ borderRadius: '22px' }}
                                />
                            ))}
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                            <CircularProgress size={26} sx={{ color: '#2563eb' }} />
                        </Box>
                    </Box>
                ) : newsTop10.length > 0 ? (
                    <motion.div
                        key={reloadTick}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25 }}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.15 }}>
                            {newsTop10.map((news, idx) => (
                                <MotionBox
                                    key={news.rank ?? idx}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 280,
                                        damping: 22,
                                        delay: idx * 0.03,
                                    }}
                                    whileHover={{ y: -2 }}
                                    sx={{
                                        p: 1.5,
                                        borderRadius: '24px',
                                        background: 'rgba(255,255,255,0.74)',
                                        border: '1px solid rgba(255,255,255,0.94)',
                                        boxShadow: '0 10px 24px rgba(148,163,184,0.10)',
                                        transition: 'box-shadow 160ms ease, transform 160ms ease',
                                        '&:hover': {
                                            boxShadow: '0 14px 28px rgba(148,163,184,0.16)',
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'space-between',
                                            gap: 1.2,
                                        }}
                                    >
                                        {/* Left */}
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 1.2,
                                                flex: 1,
                                                minWidth: 0,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '14px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 900,
                                                    color: '#fff',
                                                    background: rankGradient(news.rank ?? idx + 1),
                                                    boxShadow: '0 10px 18px rgba(0,0,0,0.12)',
                                                    flex: '0 0 auto',
                                                    fontSize: 14,
                                                }}
                                            >
                                                {news.rank ?? idx + 1}
                                            </Box>

                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.8,
                                                        mb: 0.7,
                                                        flexWrap: 'wrap',
                                                    }}
                                                >
                                                    <Chip
                                                        size="small"
                                                        icon={<ArticleRoundedIcon sx={{ fontSize: '14px !important' }} />}
                                                        label={rankLabel(news.rank ?? idx + 1)}
                                                        sx={{
                                                            height: 24,
                                                            bgcolor: 'rgba(15,23,42,0.06)',
                                                            color: '#334155',
                                                            fontWeight: 800,
                                                            borderRadius: '999px',
                                                            '& .MuiChip-label': {
                                                                px: 1,
                                                                fontSize: 11,
                                                            },
                                                        }}
                                                    />
                                                </Box>

                                                <Typography
                                                    component="a"
                                                    href={news.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    sx={{
                                                        textDecoration: 'none',
                                                        color: '#0f172a',
                                                        fontWeight: 800,
                                                        fontSize: 14.5,
                                                        letterSpacing: '-0.02em',
                                                        lineHeight: 1.45,
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        '&:hover': {
                                                            color: '#2563eb',
                                                        },
                                                    }}
                                                    title={news.title}
                                                >
                                                    {news.title}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Right */}
                                        <Tooltip title="원문 보기">
                                            <IconButton
                                                component="a"
                                                href={news.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{
                                                    width: 38,
                                                    height: 38,
                                                    bgcolor: 'rgba(59,130,246,0.10)',
                                                    border: '1px solid rgba(59,130,246,0.18)',
                                                    color: '#2563eb',
                                                    flex: '0 0 auto',
                                                    '&:hover': {
                                                        bgcolor: 'rgba(59,130,246,0.16)',
                                                    },
                                                }}
                                            >
                                                <LaunchIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </MotionBox>
                            ))}
                        </Box>
                    </motion.div>
                ) : (
                    <Typography
                        sx={{
                            textAlign: 'center',
                            color: '#64748b',
                            py: 6,
                            fontWeight: 600,
                        }}
                    >
                        현재 표시할 뉴스가 없습니다.
                    </Typography>
                )}
            </CardContent>
        </MotionCard>
    );
}

export default NewsCard;
