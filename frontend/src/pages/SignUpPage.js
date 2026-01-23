import React, { useMemo, useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Link,
    Alert,
    Divider,
    IconButton,
    InputAdornment,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AuthLayout from '../components/AuthLayout';
import { signup } from '../api/auth';

function SignUpPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const themeColor = '#f76d57';
    const accent2 = '#ffb199';
    const navigate = useNavigate();

    const canSubmit = useMemo(() => {
        return form.email.trim().length > 0 && form.password.trim().length > 0 && !loading;
    }, [form.email, form.password, loading]);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;

        setLoading(true);
        setError('');

        try {
            await signup(form.email, form.password);
            alert('회원가입 성공! 로그인 페이지로 이동합니다.');
            navigate('/login');
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                '회원가입 실패';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout logoType="signup">
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
                        Create your account
                    </Typography>

                    <Typography sx={{ mt: 0.8, color: 'rgba(255,255,255,0.62)' }} variant="body2">
                        Sign up to access your Daily Briefing
                    </Typography>
                </Box>

                {/* ✅ LoginPage와 동일 톤: 다크 글래스 폼 컨테이너 */}
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
                    {/* subtle glow */}
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            background: `radial-gradient(700px circle at 50% 0%, ${themeColor}22, transparent 60%)`,
                        }}
                    />

                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ position: 'relative', mt: 0.5 }}>
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
                            }}
                        />

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="password"
                            label="Password"
                            name="password"
                            type={showPw ? 'text' : 'password'}
                            autoComplete="new-password"
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
                                mb: 0.5,
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
                            {loading ? 'Signing up…' : 'Sign up'}
                        </Button>

                        <Divider sx={{ my: 2.2, opacity: 0.25, borderColor: 'rgba(255,255,255,0.25)' }} />

                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                                Already have an account?{' '}
                                <Link
                                    component={RouterLink}
                                    to="/login"
                                    variant="body2"
                                    sx={{
                                        fontWeight: 900,
                                        color: 'rgba(255,255,255,0.92)',
                                        textDecoration: 'none',
                                        '&:hover': { textDecoration: 'underline' },
                                    }}
                                >
                                    Log in
                                </Link>
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </motion.div>
        </AuthLayout>
    );
}

export default SignUpPage;
