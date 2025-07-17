import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Link, Alert } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';

function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const themeColor = '#f76d57';

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:8081/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '로그인 실패');
            }

            const data = await response.json();
            localStorage.setItem('token', data.token);
            navigate('/dashboard'); // 로그인 성공 → 대시보드 이동
        } catch (err) {
            setError(err.message);
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
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                        },
                    }}
                />

                {/* ❗에러 메시지 표시 */}
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
                    <Typography sx={{ fontWeight: 'bold' }}>Log in</Typography>
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
