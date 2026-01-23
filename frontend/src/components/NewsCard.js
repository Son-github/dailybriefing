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
import { motion } from 'framer-motion';
import api from '../api/api';

const MotionCard = motion(Card);
const MotionBox = motion(Box);

function rankGradient(rank) {
    if (rank === 1) return 'linear-gradient(135deg, #ffb300, #ff6f00)';
    if (rank === 2) return 'linear-gradient(135deg, #90a4ae, #546e7a)';
    if (rank === 3) return 'linear-gradient(135deg, #b26a00, #6d4c41)';
    return 'linear-gradient(135deg, #1976d2, #42a5f5)';
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
            whileHover={{ y: -3, scale: 1.01 }}
            sx={{
                borderRadius: 6,
                overflow: 'hidden',
                position: 'relative',
                bgcolor: 'rgba(255,255,255,0.78)',
                border: '1px solid rgba(255,255,255,0.6)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                minHeight: 420,
            }}
        >
            {/* subtle gradient glow */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    background:
                        'radial-gradient(700px 220px at 20% 0%, rgba(59,130,246,0.18), transparent 60%), radial-gradient(650px 220px at 95% 20%, rgba(34,197,94,0.12), transparent 58%)',
                    pointerEvents: 'none',
                }}
            />

            <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2.2, position: 'relative' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: '#111827', letterSpacing: '-0.01em' }}>
                            오늘의 주요 뉴스
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(17,24,39,0.65)' }}>
                            Top 10 headlines
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                            label="TOP 10"
                            size="small"
                            sx={{
                                bgcolor: 'rgba(59,130,246,0.10)',
                                color: '#2563eb',
                                fontWeight: 900,
                                letterSpacing: 0.6,
                                borderRadius: 999,
                            }}
                        />

                        <Tooltip title="새로고침">
                            <IconButton
                                onClick={onReload}
                                sx={{
                                    width: 36,
                                    height: 36,
                                    bgcolor: 'rgba(0,0,0,0.04)',
                                    border: '1px solid rgba(0,0,0,0.06)',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
                                }}
                            >
                                <motion.div
                                    animate={loading ? { rotate: 360 } : { rotate: 0 }}
                                    transition={loading ? { repeat: Infinity, duration: 0.9, ease: 'linear' } : { duration: 0.2 }}
                                >
                                    <RefreshIcon fontSize="small" />
                                </motion.div>
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Body */}
                {loading ? (
                    <Box sx={{ py: 1 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                            {[...Array(7)].map((_, idx) => (
                                <Skeleton key={idx} variant="rounded" height={46} sx={{ borderRadius: 3 }} />
                            ))}
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                            <CircularProgress size={26} />
                        </Box>
                    </Box>
                ) : newsTop10.length > 0 ? (
                    <motion.div
                        key={reloadTick}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25 }}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1 }}>
                            {newsTop10.map((news, idx) => (
                                <MotionBox
                                    key={news.rank ?? idx}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ type: 'spring', stiffness: 280, damping: 22, delay: idx * 0.03 }}
                                    whileHover={{ y: -2 }}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 1.2,
                                        p: 1.4,
                                        borderRadius: 3,
                                        bgcolor: 'rgba(255,255,255,0.72)',
                                        border: '1px solid rgba(0,0,0,0.06)',
                                        boxShadow: '0 10px 22px rgba(0,0,0,0.06)',
                                        transition: 'box-shadow 160ms ease, transform 160ms ease',
                                        '&:hover': { boxShadow: '0 14px 28px rgba(0,0,0,0.10)' },
                                    }}
                                >
                                    {/* Left: rank + title */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flex: 1, minWidth: 0 }}>
                                        <Box
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 999,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 900,
                                                color: '#fff',
                                                background: rankGradient(news.rank ?? idx + 1),
                                                boxShadow: '0 10px 18px rgba(0,0,0,0.14)',
                                                flex: '0 0 auto',
                                            }}
                                        >
                                            {news.rank ?? idx + 1}
                                        </Box>

                                        <Typography
                                            component="a"
                                            href={news.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{
                                                textDecoration: 'none',
                                                color: '#111827',
                                                fontWeight: 800,
                                                letterSpacing: '-0.01em',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                flex: 1,
                                                '&:hover': { color: '#2563eb' },
                                            }}
                                            title={news.title}
                                        >
                                            {news.title}
                                        </Typography>
                                    </Box>

                                    {/* Right: open icon */}
                                    <Tooltip title="원문 보기">
                                        <IconButton
                                            component="a"
                                            href={news.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{
                                                width: 36,
                                                height: 36,
                                                bgcolor: 'rgba(59,130,246,0.10)',
                                                border: '1px solid rgba(59,130,246,0.18)',
                                                color: '#2563eb',
                                                '&:hover': { bgcolor: 'rgba(59,130,246,0.14)' },
                                                flex: '0 0 auto',
                                            }}
                                        >
                                            <LaunchIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </MotionBox>
                            ))}
                        </Box>
                    </motion.div>
                ) : (
                    <Typography textAlign="center" color="text.secondary" sx={{ py: 6 }}>
                        현재 표시할 뉴스가 없습니다.
                    </Typography>
                )}
            </CardContent>
        </MotionCard>
    );
}

export default NewsCard;
