import React from 'react';
import Logo from '../assets/Logo.png';
import { Box, Container, Typography } from '@mui/material';

// 로그인 페이지의 'S' 로고
const LoginLogo = () => (
    <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M63.6364 10C51.5152 10 42.4242 19.3182 42.4242 31.8182C42.4242 41.2159 48.4848 49.0455 56.9697 52.125V52.2727C51.5152 54.8295 47.7273 60.6705 47.7273 67.5C47.7273 78.9773 56.9697 88.6364 69.0909 88.6364C81.2121 88.6364 90.303 79.3182 90.303 66.8182C90.303 57.4205 84.2424 49.5909 75.7576 46.5114V46.3636C81.2121 43.8068 85 37.9659 85 31.1364C85 19.6591 76.2121 10 63.6364 10Z" fill="#F96356"/>
        <path d="M36.3636 90C48.4848 90 57.5758 80.6818 57.5758 68.1818C57.5758 58.7841 51.5152 50.9545 43.0303 47.875V47.7273C48.4848 45.1705 52.2727 39.3295 52.2727 32.5C52.2727 21.0227 43.0303 11.3636 30.9091 11.3636C18.7879 11.3636 9.69697 20.6818 9.69697 33.1818C9.69697 42.5795 15.7576 50.4091 24.2424 53.4886V53.6364C18.7879 56.1932 15 62.0341 15 68.8636C15 80.3409 23.7879 90 36.3636 90Z" fill="#F96356"/>
    </svg>
);

// 회원가입 페이지의 'SMART INFO HUB' 로고
const SignUpLogo = () => (
    <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="80" height="60" rx="15" stroke="#f76d57" strokeWidth="4"/>
        <circle cx="50" cy="35" r="10" stroke="#f76d57" strokeWidth="4"/>
        <path d="M40 25L35 20M60 25L65 20M50 15V10M50 55V60M30 40L25 40M70 40L75 40M38 52C40.6667 56.6667 59.3333 56.6667 62 52" stroke="#f76d57" strokeWidth="4" strokeLinecap="round"/>
        <path d="M25 60C30 75, 70 75, 75 60" stroke="#f76d57" strokeWidth="4" strokeLinecap="round" />
    </svg>
);

// props로 logoType, title, children을 받습니다.
function AuthLayout({ logoType, title, children }) {
    return (
        <Container component="main" maxWidth="xs" sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh'
        }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                {/* 3. 기존의 SVG 컴포넌트 대신, Box를 img 태그처럼 사용하여 이미지를 표시합니다. */}
                <Box
                    component="img"
                    src={Logo} // src 속성에 import한 이미지 변수를 넣어줍니다.
                    alt={`${logoType} Logo`} // 이미지가 보이지 않을 때 표시될 대체 텍스트
                    sx={{
                        width: 280,
                        height: 280,
                        mb: title ? 0 : 3 // 타이틀이 없을 경우 로고 아래에 여백을 줍니다.
                    }}
                />

                {/* title이 있으면 h5 태그로 보여줍니다. */}
                {title && (
                    <Typography
                        variant="h5"
                        component="h1"
                        sx={{ fontWeight: 'bold', color: '#f76d57', mt: 1, mb: 3 }}
                    >
                        {title}
                    </Typography>
                )}

                {/* children은 이 레이아웃을 사용하는 컴포넌트의 실제 내용(폼 등)이 됩니다. */}
                {children}
            </Box>
        </Container>
    );
}

export default AuthLayout;