import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Button, Chip, IconButton, Tooltip, useMediaQuery } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

export default function Header({ userEmail, onLogout, onRefresh }) {
    const safeEmail = (userEmail || '').trim();
    const location = useLocation();

    // ✅ “웹에서도 모바일 레이아웃” 고정: true로 두면 항상 모바일 UI
    const MOBILE_FIXED = true;
    const isSmallScreen = useMediaQuery('(max-width:600px)');
    const isMobileUI = MOBILE_FIXED || isSmallScreen;

    const isMyPage = location.pathname.startsWith('/mypage');
    const isAuthPage = location.pathname.startsWith('/login') || location.pathname.startsWith('/signup');

    // ✅ token 상태는 mount 시점에 변할 수 있으니 state로 추적(UX 안정)
    const [hasToken, setHasToken] = useState(!!localStorage.getItem('token'));
    useEffect(() => {
        const tick = setInterval(() => {
            const v = !!localStorage.getItem('token');
            setHasToken(v);
        }, 800);
        return () => clearInterval(tick);
    }, []);

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
                px: isMobileUI ? 1.2 : 2,
                pt: isMobileUI ? 1.0 : 1.5,
                pb: isMobileUI ? 1.0 : 1.5,
                // ✅ 웹에서도 “fix된 느낌”: sticky 영역에 살짝 배경을 깔아 스크롤 시 위가 비지 않게
                background:
                    'linear-gradient(180deg, rgba(11,18,32,0.92) 0%, rgba(11,18,32,0.55) 60%, rgba(11,18,32,0) 100%)',
                backdropFilter: 'blur(10px)',
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
                <Box
                    sx={{
                        borderRadius: 5,
                        px: isMobileUI ? 1.4 : 2,
                        py: isMobileUI ? 1.0 : 1.3,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 1.2,

                        bgcolor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 14px 40px rgba(0,0,0,0.20)',
                    }}
                >
                    {/* Left */}
                    <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.0 }}>
                        <Box sx={{ minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                <Typography
                                    sx={{
                                        color: 'rgba(255,255,255,0.92)',
                                        fontWeight: 900,
                                        letterSpacing: '-0.02em',
                                        lineHeight: 1.1,
                                        fontSize: isMobileUI ? 15 : 16,
                                    }}
                                >
                                    Daily Briefing
                                </Typography>

                                <Chip
                                    size="small"
                                    label="LIVE"
                                    sx={{
                                        height: isMobileUI ? 20 : 22,
                                        borderRadius: 999,
                                        bgcolor: 'rgba(34,197,94,0.16)',
                                        color: 'rgba(255,255,255,0.88)',
                                        fontWeight: 900,
                                        letterSpacing: 0.6,
                                    }}
                                />
                            </Box>

                            <Typography
                                sx={{
                                    mt: 0.35,
                                    color: 'rgba(255,255,255,0.55)',
                                    fontSize: 12,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: isMobileUI ? 170 : 260,
                                }}
                                title={safeEmail}
                            >
                                {safeEmail || (isLoggedIn ? 'Loading…' : 'Guest')}
                            </Typography>
                        </Box>

                        {/* 이메일 복사 버튼(이메일 있을 때만) */}
                        {!!safeEmail && (
                            <Tooltip title={copied ? '복사됨!' : '이메일 복사'}>
                                <IconButton
                                    onClick={handleCopyEmail}
                                    size="small"
                                    sx={{
                                        color: 'rgba(255,255,255,0.85)',
                                        bgcolor: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.10)',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.10)' },
                                        p: isMobileUI ? 0.55 : 0.75,
                                    }}
                                >
                                    <ContentCopyIcon sx={{ fontSize: isMobileUI ? 16 : 18 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>

                    {/* Right */}
                    <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center' }}>
                        {/* ✅ 로그인 상태 */}
                        {isLoggedIn ? (
                            <>
                                {/* 대시보드에서만 새로고침 아이콘(원하면 Dashboard에서 onRefresh를 내려주면 됨) */}
                                {!isAuthPage && !!onRefresh && (
                                    <Tooltip title="새로고침">
                                        <IconButton
                                            onClick={onRefresh}
                                            size="small"
                                            sx={{
                                                color: 'rgba(255,255,255,0.85)',
                                                bgcolor: 'rgba(255,255,255,0.06)',
                                                border: '1px solid rgba(255,255,255,0.10)',
                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.10)' },
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
                            // ✅ 비로그인 상태
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
        borderRadius: 999,
        px: mobileUI ? 1.2 : 1.6,
        py: 0.7,
        minWidth: 0,
        fontWeight: 900,
        color: 'rgba(255,255,255,0.88)',
        borderColor: 'rgba(255,255,255,0.22)',
        bgcolor: disabledLike ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
        '&:hover': {
            borderColor: 'rgba(255,255,255,0.30)',
            bgcolor: 'rgba(255,255,255,0.10)',
        },
        textTransform: 'none',
        opacity: disabledLike ? 0.75 : 1,
        fontSize: mobileUI ? 12 : 13,
    };
}

function pillPrimarySx(mobileUI = false) {
    return {
        borderRadius: 999,
        px: mobileUI ? 1.2 : 1.6,
        py: 0.7,
        minWidth: 0,
        fontWeight: 900,
        textTransform: 'none',
        fontSize: mobileUI ? 12 : 13,
        background: 'linear-gradient(135deg, #f76d57, #ffb199)',
        boxShadow: '0 14px 30px rgba(247,109,87,0.18)',
        '&:hover': {
            filter: 'brightness(0.98)',
            transform: 'translateY(-1px)',
        },
        transition: 'transform 0.15s ease, filter 0.15s ease',
    };
}
