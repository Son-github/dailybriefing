import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Link, Alert } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { signup } from '../api/auth';

function SignUpPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const themeColor = '#f76d57';
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
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
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />

                <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="password"
                    label="Password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                    disabled={loading}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
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
                        '&:hover': { backgroundColor: '#e55a44' },
                    }}
                >
                    <Typography sx={{ fontWeight: 'bold' }}>
                        {loading ? 'Signing up...' : 'Sign up'}
                    </Typography>
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        Already have an account?{' '}
                        <Link
                            component={RouterLink}
                            to="/login"
                            variant="body2"
                            sx={{ fontWeight: 'bold', color: 'text.primary', textDecoration: 'none' }}
                        >
                            Log in
                        </Link>
                    </Typography>
                </Box>
            </Box>
        </AuthLayout>
    );
}

export default SignUpPage;
