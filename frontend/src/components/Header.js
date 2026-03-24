import React, { useMemo, useState } from 'react';
import { Box, Typography, Button, Chip, IconButton, Tooltip, useMediaQuery } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';

export default function Header({ userEmail, onLogout, onRefresh }) {
    const safeEmail = (userEmail || '').trim();
    const location = useLocation();

    const MOBILE_FIXED = true;
    const isSmallScreen = useMediaQuery('(max-width:600px)');
    const isMobileUI = MOBILE_FIXED || isSmallScreen;

    const isMyPage = location.pathname.startsWith('/mypage');
    const isAuthPage = location.pathname.startsWith('/login') || location.pathname.startsWith('/signup');

    const hasToken = !!localStorage.getItem('token'); // 짧은 설명: mount 시점 기준 토큰만 간단 확인
    const isLoggedIn = useMemo(() => !!safeEmail || hasToken, [safeEmail, hasToken]);

    const [copied, setCopied] = useState(false);

    const handleLogout = () => {
        const ok = window.confirm('로그아웃할까요?');
        if (ok) onLogout?.();
    };

    const handleCopyEmail = async () => {
        if (!safeEmail) return;
        try {
            await navigator.clipboard.writeText(safeEmail);
            setCopied(true);
            setTimeout(() => setCopied(false), 900);
        } catch {
            // ignore
        }
    };

    return (
        <Box
            sx={{
                position: 'sticky',
                top: 0,
                zIndex: 999,
                px: isMobileUI ? 1.4 : 2,
                pt: isMobileUI ? 1.0 : 1.5,
                pb: isMobileUI ? 1.0 : 1.5,
                background:
                    'linear-gradient(180deg, rgba(245,251,255,0.96) 0%, rgba(245,251,255,0.72) 58%, rgba(245,251,255,0) 100%)',
                backdropFilter: 'blur(14px)',
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
                <Box
                    sx={{
                        borderRadius: '28px',
                        px: isMobileUI ? 1.5 : 2,
                        py: isMobileUI ? 1.15 : 1.35,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 1.2,
                        background:
                            'linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(240,249,255,0.96) 52%, rgba(248,250,252,0.94) 100%)',
                        border: '1px solid rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(14px)',
                        boxShadow: '0 12px 30px rgba(148,163,184,0.14)',
                    }}
                >
                    <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.0 }}>
                        <Box
                            sx={{
                                width: isMobileUI ? 36 : 40,
                                height: isMobileUI ? 36 : 40,
                                borderRadius: '14px',
                                display: 'grid',
                                placeItems: 'center',
                                background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                                color: '#fff',
                                boxShadow: '0 10px 24px rgba(56,189,248,0.22)',
                                flexShrink: 0,
                            }}
                        >
                            <AutoAwesomeRoundedIcon sx={{ fontSize: isMobileUI ? 18 : 20 }} />
                        </Box>

                        <Box sx={{ minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                                <Typography
                                    sx={{
                                        color: '#0f172a',
                                        fontWeight: 900,
                                        letterSpacing: '-0.03em',
                                        lineHeight: 1.1,
                                        fontSize: isMobileUI ? 15.5 : 16.5,
                                    }}
                                >
                                    Daily Briefing
                                </Typography>

                                <Chip
                                    size="small"
                                    label="LIVE"
                                    sx={{
                                        height: isMobileUI ? 21 : 22,
                                        borderRadius: '999px',
                                        bgcolor: 'rgba(14,165,233,0.10)',
                                        color: '#0369a1',
                                        fontWeight: 900,
                                        letterSpacing: 0.4,
                                        border: '1px solid rgba(14,165,233,0.14)',
                                        '& .MuiChip-label': {
                                            px: 0.9,
                                        },
                                    }}
                                />
                            </Box>

                            <Typography
                                sx={{
                                    mt: 0.4,
                                    color: '#64748b',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: isMobileUI ? 160 : 260,
                                }}
                                title={safeEmail}
                            >
                                {safeEmail || (isLoggedIn ? 'Loading…' : 'Guest')}
                            </Typography>
                        </Box>

                        {!!safeEmail && (
                            <Tooltip title={copied ? '복사됨!' : '이메일 복사'}>
                                <IconButton
                                    onClick={handleCopyEmail}
                                    size="small"
                                    sx={{
                                        color: '#475569',
                                        bgcolor: 'rgba(255,255,255,0.74)',
                                        border: '1px solid rgba(255,255,255,0.92)',
                                        boxShadow: '0 8px 18px rgba(148,163,184,0.08)',
                                        '&:hover': {
                                            bgcolor: 'rgba(255,255,255,0.96)',
                                        },
                                        p: isMobileUI ? 0.55 : 0.75,
                                        flexShrink: 0,
                                    }}
                                >
                                    <ContentCopyIcon sx={{ fontSize: isMobileUI ? 16 : 18 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexShrink: 0 }}>
                        {isLoggedIn ? (
                            <>
                                {!isAuthPage && !!onRefresh && (
                                    <Tooltip title="새로고침">
                                        <IconButton
                                            onClick={onRefresh}
                                            size="small"
                                            sx={{
                                                color: '#475569',
                                                bgcolor: 'rgba(255,255,255,0.74)',
                                                border: '1px solid rgba(255,255,255,0.92)',
                                                boxShadow: '0 8px 18px rgba(148,163,184,0.08)',
                                                '&:hover': {
                                                    bgcolor: 'rgba(255,255,255,0.96)',
                                                },
                                                p: isMobileUI ? 0.55 : 0.75,
                                            }}
                                        >
                                            <RefreshRoundedIcon sx={{ fontSize: isMobileUI ? 18 : 20 }} />
                                        </IconButton>
                                    </Tooltip>
                                )}

                                {!isAuthPage && (
                                    <Button
                                        component={RouterLink}
                                        to="/mypage"
                                        size="small"
                                        variant="outlined"
                                        startIcon={!isMobileUI ? <PersonRoundedIcon /> : null}
                                        disabled={isMyPage}
                                        sx={pillOutlineSx(isMyPage, isMobileUI)}
                                    >
                                        {isMobileUI ? 'My' : '마이페이지'}
                                    </Button>
                                )}

                                <Button
                                    onClick={handleLogout}
                                    size="small"
                                    variant="contained"
                                    startIcon={!isMobileUI ? <LogoutRoundedIcon /> : null}
                                    sx={pillPrimarySx(isMobileUI)}
                                >
                                    {isMobileUI ? 'OUT' : '로그아웃'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    component={RouterLink}
                                    to="/login"
                                    size="small"
                                    variant="outlined"
                                    startIcon={!isMobileUI ? <LoginRoundedIcon /> : null}
                                    sx={pillOutlineSx(location.pathname.startsWith('/login'), isMobileUI)}
                                >
                                    {isMobileUI ? 'IN' : '로그인'}
                                </Button>

                                <Button
                                    component={RouterLink}
                                    to="/signup"
                                    size="small"
                                    variant="contained"
                                    startIcon={!isMobileUI ? <PersonAddAltRoundedIcon /> : null}
                                    sx={pillPrimarySx(isMobileUI)}
                                >
                                    {isMobileUI ? 'JOIN' : '회원가입'}
                                </Button>
                            </>
                        )}
                    </Box>
                </Box>
            </motion.div>
        </Box>
    );
}

function pillOutlineSx(disabledLike = false, mobileUI = false) {
    return {
        borderRadius: '999px',
        px: mobileUI ? 1.2 : 1.6,
        py: 0.7,
        minWidth: 0,
        fontWeight: 800,
        color: '#334155',
        borderColor: 'rgba(203,213,225,0.9)',
        bgcolor: disabledLike ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.72)',
        boxShadow: '0 8px 18px rgba(148,163,184,0.08)',
        '&:hover': {
            borderColor: 'rgba(148,163,184,0.9)',
            bgcolor: 'rgba(255,255,255,0.94)',
        },
        textTransform: 'none',
        opacity: disabledLike ? 0.78 : 1,
        fontSize: mobileUI ? 12 : 13,
        whiteSpace: 'nowrap',
    };
}

function pillPrimarySx(mobileUI = false) {
    return {
        borderRadius: '999px',
        px: mobileUI ? 1.2 : 1.6,
        py: 0.7,
        minWidth: 0,
        fontWeight: 900,
        textTransform: 'none',
        fontSize: mobileUI ? 12 : 13,
        color: '#fff',
        background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
        boxShadow: '0 14px 26px rgba(99,102,241,0.20)',
        '&:hover': {
            filter: 'brightness(0.98)',
            transform: 'translateY(-1px)',
        },
        transition: 'transform 0.15s ease, filter 0.15s ease',
        whiteSpace: 'nowrap',
    };
}
