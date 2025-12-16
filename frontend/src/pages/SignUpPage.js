import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Link, Alert } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';

function SignUpPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const themeColor = '#f76d57';

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch("${API_BASE}/auth/signup", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (!response.ok) {
                const errorMessage = await response.text();
                throw new Error(errorMessage || '회원가입 실패');
            }

            alert('회원가입 성공! 로그인 페이지로 이동합니다.');
            window.location.href = '/login';
        } catch (error) {
            setError(error.message);
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
                    sx={{
                        mt: 3,
                        mb: 2,
                        py: 1.5,
                        backgroundColor: themeColor,
                        borderRadius: '12px',
                        '&:hover': { backgroundColor: '#e55a44' }
                    }}
                >
                    <Typography sx={{ fontWeight: 'bold' }}>Sign up</Typography>
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


