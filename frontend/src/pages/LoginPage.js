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
import AuthLayout from '../components/AuthLayout';
import { login } from '../api/auth';
import api from '../api/api'; // ✅ 추가: /auth/me 호출용

function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const navigate = useNavigate();

    const themeColor = '#f76d57';
    const accent2 = '#ffb199';

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

            // ✅ 토큰 저장
            localStorage.setItem('token', data.accessToken);

            // ✅ userId는 일단 email로 저장(임시로 충분)
            localStorage.setItem('userId', form.email);

            // ✅ 로그인 직후 내 정보(선호지역) 캐시해두면 Dashboard/Weather가 편해짐
            //    (실패해도 로그인은 성공 처리)
            try {
                const meRes = await api.get('/auth/me');
                const region = meRes?.data?.weatherRegion || 'SEOUL';
                localStorage.setItem('weatherRegion', region);
            } catch (_) {
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
                <Box sx={{ mb: 2, textAlign: 'center' }}>
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 900,
                            letterSpacing: '-0.02em',
                            lineHeight: 1.1,
                            color: 'rgba(255,255,255,0.92)',
                        }}
                    >
                        Welcome back
                    </Typography>

                    <Typography sx={{ mt: 0.8, color: 'rgba(255,255,255,0.62)' }} variant="body2">
                        Sign in to your Daily Briefing dashboard
                    </Typography>
                </Box>

                <Box
                    sx={{
                        position: 'relative',
                        borderRadius: 6,
                        p: 2.4,
                        bgcolor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            background: `radial-gradient(700px circle at 50% 0%, ${themeColor}22, transparent 60%)`,
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
                            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.65)' } }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    bgcolor: 'rgba(255,255,255,0.06)',
                                    color: 'rgba(255,255,255,0.88)',
                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.16)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.28)' },
                                    '&.Mui-focused fieldset': { borderColor: `${themeColor}88` },
                                },
                                '& input::placeholder': { color: 'rgba(255,255,255,0.45)' },
                            }}
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
                            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.65)' } }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    bgcolor: 'rgba(255,255,255,0.06)',
                                    color: 'rgba(255,255,255,0.88)',
                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.16)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.28)' },
                                    '&.Mui-focused fieldset': { borderColor: `${themeColor}88` },
                                },
                            }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPw((v) => !v)}
                                            edge="end"
                                            disabled={loading}
                                            aria-label="toggle password visibility"
                                            sx={{ color: 'rgba(255,255,255,0.72)' }}
                                        >
                                            {showPw ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {error && (
                            <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
                                {error}
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disableElevation
                            disabled={!canSubmit}
                            sx={{
                                mt: 2.5,
                                py: 1.35,
                                borderRadius: 3,
                                fontWeight: 900,
                                textTransform: 'none',
                                background: `linear-gradient(135deg, ${themeColor}, ${accent2})`,
                                boxShadow: `0 16px 34px ${themeColor}22`,
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

                        <Divider sx={{ my: 2.2, opacity: 0.25, borderColor: 'rgba(255,255,255,0.25)' }} />

                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                                Don&apos;t have an account?{' '}
                                <Link
                                    component={RouterLink}
                                    to="/signup"
                                    variant="body2"
                                    sx={{
                                        fontWeight: 900,
                                        color: 'rgba(255,255,255,0.92)',
                                        textDecoration: 'none',
                                        '&:hover': { textDecoration: 'underline' },
                                    }}
                                >
                                    Sign up
                                </Link>
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </motion.div>
        </AuthLayout>
    );
}

export default LoginPage;
