import React from 'react';
import Logo from '../assets/Logo.png';
import { Box, Container, Typography } from '@mui/material';

// props로 logoType, title, children을 받습니다.
function AuthLayout({ logoType = 'login', title, children }) {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                position: 'relative',
                overflow: 'hidden',
                bgcolor: '#0b1220', // ✅ Dashboard와 통일
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 2,
            }}
        >
            {/* ✅ Dashboard 스타일 그라데이션 블랍 */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background:
                        'radial-gradient(900px circle at 20% 10%, rgba(34,197,94,0.22), transparent 55%), radial-gradient(900px circle at 80% 20%, rgba(59,130,246,0.18), transparent 55%), radial-gradient(900px circle at 50% 90%, rgba(168,85,247,0.16), transparent 55%)',
                    filter: 'blur(2px)',
                }}
            />

            {/* ✅ 은은한 노이즈 (고급스러운 질감) */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    opacity: 0.06,
                    backgroundImage:
                        'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27160%27 height=%27160%27 viewBox=%270 0 160 160%27%3E%3Cfilter id=%27n%27 x=%270%27 y=%270%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.8%27 numOctaves=%272%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27160%27 height=%27160%27 filter=%27url(%23n)%27 opacity=%270.35%27/%3E%3C/svg%3E")',
                    backgroundSize: '160px 160px',
                }}
            />

            <Container component="main" maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
                {/* ✅ 중앙 글래스 카드 */}
                <Box
                    sx={{
                        borderRadius: 6,
                        p: 3,
                        bgcolor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                        }}
                    >
                        {/* ✅ 로고 */}
                        <Box
                            component="img"
                            src={Logo}
                            alt={`${logoType} Logo`}
                            sx={{
                                width: logoType === 'signup' ? 220 : 240,
                                height: 'auto',
                                mb: title ? 1 : 2,
                                filter: 'drop-shadow(0 12px 26px rgba(0,0,0,0.35))',
                                userSelect: 'none',
                            }}
                        />

                        {/* ✅ 타이틀(옵션) */}
                        {title && (
                            <Typography
                                variant="h6"
                                component="h1"
                                sx={{
                                    fontWeight: 900,
                                    letterSpacing: '-0.02em',
                                    color: 'rgba(255,255,255,0.92)',
                                    mb: 2,
                                }}
                            >
                                {title}
                            </Typography>
                        )}

                        {/* ✅ 폼(children) */}
                        <Box sx={{ width: '100%' }}>{children}</Box>

                        {/* ✅ 하단 micro-copy (원하면 삭제 가능) */}
                        <Typography
                            variant="caption"
                            sx={{
                                mt: 2,
                                color: 'rgba(255,255,255,0.45)',
                            }}
                        >
                            Secure session · Refresh cookies enabled
                        </Typography>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
}

export default AuthLayout;
