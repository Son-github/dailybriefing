import React from 'react';
import Logo from '../assets/Logo.png';
import { Box, Container, Typography } from '@mui/material';

function AuthLayout({ logoType = 'login', title, children }) {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 2,
                background: 'linear-gradient(180deg, #f5fbff 0%, #ffffff 42%, #eef7ff 100%)',
            }}
        >
            {/* 밝은 배경 오브젝트 */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    overflow: 'hidden',
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: -120,
                        left: -80,
                        width: 280,
                        height: 280,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(125,211,252,0.42) 0%, rgba(125,211,252,0.12) 46%, rgba(125,211,252,0) 72%)',
                        filter: 'blur(10px)',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        top: 70,
                        right: -90,
                        width: 290,
                        height: 290,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(165,180,252,0.34) 0%, rgba(165,180,252,0.10) 46%, rgba(165,180,252,0) 72%)',
                        filter: 'blur(12px)',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -120,
                        left: '18%',
                        width: 250,
                        height: 250,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(103,232,249,0.24) 0%, rgba(103,232,249,0.08) 46%, rgba(103,232,249,0) 72%)',
                        filter: 'blur(12px)',
                    }}
                />
            </Box>

            <Container component="main" maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
                <Box
                    sx={{
                        borderRadius: '34px',
                        p: { xs: 2.4, sm: 3 },
                        background:
                            'linear-gradient(135deg, rgba(255,255,255,0.80) 0%, rgba(255,255,255,0.64) 100%)',
                        border: '1px solid rgba(255,255,255,0.88)',
                        backdropFilter: 'blur(18px)',
                        boxShadow: '0 20px 60px rgba(148,163,184,0.16)',
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
                        <Box
                            component="img"
                            src={Logo}
                            alt={`${logoType} Logo`}
                            sx={{
                                width: logoType === 'signup' ? 210 : 230,
                                height: 'auto',
                                mb: title ? 1 : 1.8,
                                filter: 'drop-shadow(0 12px 24px rgba(148,163,184,0.18))',
                                userSelect: 'none',
                            }}
                        />

                        {title && (
                            <Typography
                                variant="h6"
                                component="h1"
                                sx={{
                                    fontWeight: 900,
                                    letterSpacing: '-0.02em',
                                    color: '#0f172a',
                                    mb: 2,
                                }}
                            >
                                {title}
                            </Typography>
                        )}

                        <Box sx={{ width: '100%' }}>{children}</Box>

                        <Typography
                            variant="caption"
                            sx={{
                                mt: 2,
                                color: '#94a3b8',
                                fontWeight: 600,
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
