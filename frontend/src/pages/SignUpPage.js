import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Link, Alert } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';

function SignUpPage() {
    const [form, setForm] = useState({ name: '', email: '' });
    const [error, setError] = useState('');
    const themeColor = '#f76d57';

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
        setError(''); // 사용자가 입력을 바꿀 경우 에러 초기화
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:8081/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '회원가입 실패');
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
                    id="name"
                    label="Name"
                    name="name"
                    autoComplete="name"
                    autoFocus
                    value={form.name}
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
                    id="email"
                    label="Email"
                    name="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                        },
                    }}
                />

                {/* 🔻 에러 메시지 표시 */}
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

