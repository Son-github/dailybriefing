import React, { useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Logo from '../assets/Logo.png';
import { logout } from '../api/auth';

function Header() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // ✅ 토큰 존재 여부만으로 로그인 상태 판단
    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
    }, [location.pathname]);
    // 페이지 이동 시마다 상태 갱신 (가장 단순 + 안정적)

    const handleLogout = async () => {
        try {
            await logout(); // auth.js에서 localStorage 제거
        } finally {
            setIsLoggedIn(false);
            alert('로그아웃 되었습니다.');
            navigate('/login');
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                maxWidth: '600px',
                mx: 'auto',
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
                                fontWeight: 'bold',
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
                            },
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
