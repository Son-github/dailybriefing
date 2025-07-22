import React, { useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';
import Logo from '../assets/Logo.png';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

function Header() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const now = Date.now() / 1000;
                if (decoded.exp > now) {
                    setIsLoggedIn(true);
                } else {
                    setIsLoggedIn(false);
                }
            } catch (err) {
                setIsLoggedIn(false);
            }
        } else {
            setIsLoggedIn(false);
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        alert('로그아웃 되었습니다.');
        navigate('/login');
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                maxWidth: '600px',
                mx: 'auto'
            }}
        >
            <Link
                to="/"
                style={{
                    display: 'inline-block',
                    margin: 0,
                    padding: 0,
                    lineHeight: 0,
                    textDecoration: 'none',
                }}
            >
                <img
                    src={Logo}
                    alt="Dashboard Logo"
                    style={{
                        height: '90px',
                        display: 'block',
                        margin: 0,
                        padding: 0,
                        border: 'none',
                    }}
                />
            </Link>
            <Box>
                {!isLoggedIn ? (
                    <>
                        <Button
                            component={Link}
                            to="/signup"
                            variant="text"
                            sx={{ color: 'grey', fontWeight: 'bold' }}
                        >
                            Sign up
                        </Button>
                        <Button
                            component={Link}
                            to="/login"
                            variant="outlined"
                            sx={{
                                ml: 1,
                                borderRadius: '20px',
                                borderColor: 'lightgrey',
                                color: 'grey',
                                fontWeight: 'bold'
                            }}
                        >
                            Log in
                        </Button>
                    </>
                ) : (
                    <Button
                        variant="outlined"
                        onClick={handleLogout}
                        sx={{
                            borderRadius: '20px',
                            borderColor: '#f76d57',
                            color: '#f76d57',
                            fontWeight: 'bold',
                            '&:hover': {
                                backgroundColor: '#f76d57',
                                color: '#fff',
                            }
                        }}
                    >
                        로그아웃
                    </Button>
                )}
            </Box>
        </Box>
    );
}

export default Header;
