import React from 'react';
import { Box, Button } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { Link } from 'react-router-dom';

function Header() {
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
            <Link to="/" style={{ textDecoration: 'none' }}>
                <DashboardIcon sx={{ color: '#ff8f8f', fontSize: '32px', display: 'block' }} />
            </Link>
            <Box>
                <Button
                    component={Link}
                    to="/signup"
                    variant="text"
                    sx={{ color: 'grey', fontWeight: 'bold' }}
                >
                    Sign up
                </Button>
                {/* Log in 버튼이 /login 경로로 이동하도록 수정 */}
                <Button
                    component={Link}
                    to="/login"
                    variant="outlined"
                    sx={{ ml: 1, borderRadius: '20px', borderColor: 'lightgrey', color: 'grey', fontWeight: 'bold' }}
                >
                    Log in
                </Button>
            </Box>
        </Box>
    );
}

export default Header;