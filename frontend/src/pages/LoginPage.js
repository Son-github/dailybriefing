import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, Link } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';

function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const themeColor = '#f76d57';

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch('http://localhost:8081/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form),
            });

            console.log('Fetch status:', response.status);
            console.log('response:', response);

            // 응답이 JSON인지 확인!
            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error('서버에서 올바른 JSON이 내려오지 않았습니다.');
            }
            console.log('Fetch data:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || '로그인 실패');
            }

            if (!data.accessToken) {
                throw new Error('accessToken 없음 (응답 구조 확인 필요)');
            }

            localStorage.setItem('token', data.accessToken);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || '네트워크 오류');
        } finally {
            setLoading(false);
        }
    };



    return (
        <AuthLayout logoType="login">
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3 }}>
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
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                        },
                    }}
                />
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type="password"
                    id="password"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    disabled={loading}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                        },
                    }}
                />

                {error && (
                    <Alert severity="error" sx={{ mt: 2, borderRadius: '12px' }}>
                        {error}
                    </Alert>
                )}

                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disableElevation
                    disabled={loading}
                    sx={{
                        mt: 3,
                        mb: 2,
                        py: 1.5,
                        backgroundColor: themeColor,
                        borderRadius: '12px',
                        '&:hover': {
                            backgroundColor: '#e55a44',
                        }
                    }}
                >
                    <Typography sx={{ fontWeight: 'bold' }}>
                        {loading ? 'Logging in...' : 'Log in'}
                    </Typography>
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        Don't have an account?{' '}
                        <Link component={RouterLink} to="/signup" variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', textDecoration: 'none' }}>
                            Sign up
                        </Link>
                    </Typography>
                </Box>
            </Box>
        </AuthLayout>
    );
}

export default LoginPage;

