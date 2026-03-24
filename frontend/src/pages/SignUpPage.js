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
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import AuthLayout from '../components/AuthLayout';
import { signup } from '../api/auth';

const REGIONS = [
    { value: 'SEOUL', label: '서울' },
    { value: 'BUSAN', label: '부산' },
    { value: 'INCHEON', label: '인천' },
    { value: 'DAEGU', label: '대구' },
    { value: 'DAEJEON', label: '대전' },
    { value: 'GWANGJU', label: '광주' },
    { value: 'JEJU', label: '제주도' },
];

function SignUpPage() {
    const [form, setForm] = useState({ email: '', password: '', weatherRegion: 'SEOUL' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);

    const themeColor = '#38bdf8';
    const accent2 = '#818cf8';
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
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await signup(form.email, form.password, form.weatherRegion);

            setSuccess('회원가입 성공! 잠시 후 로그인 페이지로 이동합니다.');

            setTimeout(() => {
                navigate('/login');
            }, 900);
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
                <Box sx={{ mb: 2.2, textAlign: 'center' }}>
                    <Typography
                        sx={{
                            fontWeight: 900,
                            letterSpacing: '-0.04em',
                            lineHeight: 1.08,
                            color: '#0f172a',
                            fontSize: { xs: 27, sm: 31 },
                        }}
                    >
                        Create your account
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
                        지역 맞춤 브리핑을 위해
                        <br />
                        이메일과 선호 지역을 설정해보세요
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
                                'radial-gradient(520px circle at 50% 0%, rgba(129,140,248,0.14), transparent 62%)',
                        }}
                    />

                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ position: 'relative', mt: 0.4 }}>
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
                            id="password"
                            label="Password"
                            name="password"
                            type={showPw ? 'text' : 'password'}
                            autoComplete="new-password"
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

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="선호 지역"
                            name="weatherRegion"
                            value={form.weatherRegion}
                            onChange={handleChange}
                            disabled={loading}
                            select
                            SelectProps={{ native: true }}
                            InputLabelProps={{
                                style: { color: '#64748b', fontWeight: 600 },
                            }}
                            sx={{
                                ...textFieldSx(themeColor),
                                '& .MuiOutlinedInput-root': {
                                    ...textFieldSx(themeColor)['& .MuiOutlinedInput-root'],
                                    pr: 1,
                                },
                                '& select': {
                                    color: '#0f172a',
                                    fontWeight: 600,
                                    background: 'transparent',
                                },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PlaceRoundedIcon sx={{ color: '#64748b', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            }}
                        >
                            {REGIONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </TextField>

                        {success && (
                            <Alert
                                severity="success"
                                sx={{
                                    mt: 2,
                                    borderRadius: '18px',
                                    border: '1px solid rgba(34,197,94,0.16)',
                                }}
                            >
                                {success}
                            </Alert>
                        )}

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
                            startIcon={!loading ? <PersonAddAltRoundedIcon /> : null}
                            sx={{
                                mt: 2.5,
                                mb: 0.5,
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
                            {loading ? 'Signing up…' : 'Sign up'}
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
                                이미 계정이 있으신가요?{' '}
                                <Link
                                    component={RouterLink}
                                    to="/login"
                                    variant="body2"
                                    sx={{
                                        fontWeight: 900,
                                        color: '#2563eb',
                                        textDecoration: 'none',
                                        '&:hover': { textDecoration: 'underline' },
                                    }}
                                >
                                    로그인
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

export default SignUpPage;
