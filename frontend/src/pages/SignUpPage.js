import React from 'react';
import { Box, Typography, TextField, Button, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout'; // 레이아웃 import

function SignUpPage() {
    const themeColor = '#f76d57';

    return (
        <AuthLayout logoType="signup">
            <Box component="form" noValidate sx={{ mt: 1 }}>
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="name"
                    label="Name"
                    name="name"
                    autoComplete="name"
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
                    id="email"
                    label="Email"
                    name="email"
                    autoComplete="email"
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
                    id="phone"
                    label="Phone number"
                    name="phone"
                    autoComplete="tel"
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
                    id="location"
                    label="Location"
                    name="location"
                    autoComplete="address"
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
                    <Typography sx={{ fontWeight: 'bold' }}>Sign up</Typography>
                </Button>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        Already have an account?{' '}
                        <Link component={RouterLink} to="/login" variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', textDecoration: 'none' }}>
                            Log in
                        </Link>
                    </Typography>
                </Box>
            </Box>
        </AuthLayout>
    );
}

export default SignUpPage;