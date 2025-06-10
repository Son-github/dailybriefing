import React from 'react';
import { Box, Typography, TextField, Button, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout'; // 방금 만든 레이아웃 import

function LoginPage() {
    const themeColor = '#f76d57';

    return (
        <AuthLayout logoType="login">
            <Box component="form" noValidate sx={{ mt: 3 }}>
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="Email"
                    name="email"
                    autoComplete="email"
                    autoFocus
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
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                        },
                    }}
                />
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