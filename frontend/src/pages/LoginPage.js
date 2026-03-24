import React, { useMemo, useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Alert,
    Link,
    Divider,
    IconButton,
    InputAdornment,
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import AuthLayout from '../components/AuthLayout';
import { login } from '../api/auth';
import api from '../api/api';

function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const navigate = useNavigate();

    const themeColor = '#38bdf8';
    const accent2 = '#818cf8';

    const canSubmit = useMemo(() => {
        return form.email.trim().length > 0 && form.password.trim().length > 0 && !loading;
    }, [form.email, form.password, loading]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;

        setLoading(true);
        setError('');

        try {
            const data = await login(form.email, form.password);

            if (!data?.accessToken) {
                throw new Error('accessToken 없음 (응답 구조 확인 필요)');
            }

            localStorage.setItem('token', data.accessToken);

            // 짧은 설명: 실제 저장값은 이메일이므로 이름도 userEmail로 정리
            localStorage.setItem('userEmail', form.email.trim().toLowerCase());

            try {
                const meRes = await api.get('/auth/me');
                const region = meRes?.data?.weatherRegion || 'SEOUL';
                localStorage.setItem('weatherRegion', region);
            } catch (e) {
                console.error('/auth/me 조회 실패', e); // 짧은 설명: fallback 원인 추적용
                localStorage.setItem('weatherRegion', 'SEOUL');
            }

            navigate('/dashboard');
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                '로그인 실패';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout logoType="login">
            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
                <Box sx={{ mb: 2.2, textAlign: 'center' }}>
                    <Typography
                        sx={{
                            fontWeight: 900,
                            letterSpacing: '-0.04em',
                            lineHeight: 1.08,
                            color: '#0f172a',
                            fontSize: { xs: 28, sm: 32 },
                        }}
                    >
                        Welcome back
                    </Typography>

                    <Typography
                        sx={{
                            mt: 1,
                            color: '#64748b',
                            fontSize: 14,
                            lineHeight: 1.6,
                            fontWeight: 500,
                        }}
                    >
                        Daily Briefing에 로그인하고
                        <br />
                        오늘의 핵심 정보를 한눈에 확인해보세요
                    </Typography>
                </Box>

                <Box
                    sx={{
                        position: 'relative',
                        borderRadius: '28px',
                        p: { xs: 2.2, sm: 2.6 },
                        background:
                            'linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(240,249,255,0.96) 52%, rgba(248,250,252,0.94) 100%)',
                        border: '1px solid rgba(255,255,255,0.92)',
                        boxShadow: '0 16px 40px rgba(148,163,184,0.14)',
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            background:
                                'radial-gradient(520px circle at 50% 0%, rgba(56,189,248,0.12), transparent 62%)',
                        }}
                    />

                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ position: 'relative' }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={form.email}
                            onChange={handleChange}
                            disabled={loading}
                            InputLabelProps={{
                                style: { color: '#64748b', fontWeight: 600 },
                            }}
                            sx={textFieldSx(themeColor)}
                        />

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type={showPw ? 'text' : 'password'}
                            id="password"
                            autoComplete="current-password"
                            value={form.password}
                            onChange={handleChange}
                            disabled={loading}
                            InputLabelProps={{
                                style: { color: '#64748b', fontWeight: 600 },
                            }}
                            sx={textFieldSx(themeColor)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPw((v) => !v)}
                                            edge="end"
                                            disabled={loading}
                                            aria-label="toggle password visibility"
                                            sx={{ color: '#64748b' }}
                                        >
                                            {showPw ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {error && (
                            <Alert
                                severity="error"
                                sx={{
                                    mt: 2,
                                    borderRadius: '18px',
                                    border: '1px solid rgba(239,68,68,0.16)',
                                }}
                            >
                                {error}
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disableElevation
                            disabled={!canSubmit}
                            startIcon={!loading ? <LoginRoundedIcon /> : null}
                            sx={{
                                mt: 2.5,
                                py: 1.35,
                                borderRadius: '18px',
                                fontWeight: 900,
                                textTransform: 'none',
                                fontSize: 15,
                                color: '#ffffff',
                                background: `linear-gradient(135deg, ${themeColor}, ${accent2})`,
                                boxShadow: '0 16px 30px rgba(99,102,241,0.20)',
                                '&:hover': {
                                    background: `linear-gradient(135deg, ${themeColor}, ${accent2})`,
                                    filter: 'brightness(0.98)',
                                    transform: 'translateY(-1px)',
                                },
                                transition: 'transform 0.15s ease, filter 0.15s ease',
                            }}
                        >
                            {loading ? 'Logging in…' : 'Log in'}
                        </Button>

                        <Divider
                            sx={{
                                my: 2.2,
                                borderColor: 'rgba(203,213,225,0.7)',
                            }}
                        />

                        <Box sx={{ textAlign: 'center' }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: '#64748b',
                                    fontWeight: 500,
                                }}
                            >
                                아직 계정이 없으신가요?{' '}
                                <Link
                                    component={RouterLink}
                                    to="/signup"
                                    variant="body2"
                                    sx={{
                                        fontWeight: 900,
                                        color: '#2563eb',
                                        textDecoration: 'none',
                                        '&:hover': { textDecoration: 'underline' },
                                    }}
                                >
                                    회원가입
                                </Link>
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </motion.div>
        </AuthLayout>
    );
}

function textFieldSx(themeColor) {
    return {
        '& .MuiOutlinedInput-root': {
            borderRadius: '18px',
            bgcolor: 'rgba(255,255,255,0.78)',
            color: '#0f172a',
            fontWeight: 600,
            '& fieldset': {
                borderColor: 'rgba(203,213,225,0.9)',
            },
            '&:hover fieldset': {
                borderColor: 'rgba(148,163,184,0.9)',
            },
            '&.Mui-focused fieldset': {
                borderColor: themeColor,
                boxShadow: `0 0 0 3px ${themeColor}18`,
            },
        },
        '& input::placeholder': {
            color: '#94a3b8',
        },
    };
}

export default LoginPage;
