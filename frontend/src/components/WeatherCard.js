import React from 'react';
import { Card, Typography, Box } from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import AirIcon from '@mui/icons-material/Air';

function WeatherCard() {
    const location = "서울";

    return (
        <Card
            sx={{
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
                overflow: 'hidden',
                display: 'flex',         // 핵심: flex로 딱 50%씩 분할
                width: '100%',
            }}
        >
            {/* 왼쪽 영역: 날씨 */}
            <Box
                sx={{
                    width: '50%',
                    borderRight: '1px solid rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 3,
                }}
            >
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {location} 날씨
                </Typography>
                <WbSunnyIcon sx={{ fontSize: 48, color: '#FFA726' }} />
                <Typography variant="h4" fontWeight="bold">
                    23°C
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    맑음
                </Typography>
            </Box>

            {/* 오른쪽 영역: 미세먼지 */}
            <Box
                sx={{
                    width: '50%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 3,
                }}
            >
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {location} 미세먼지
                </Typography>
                <AirIcon sx={{ fontSize: 48, color: '#90CAF9' }} />
                <Typography variant="h4" fontWeight="bold">
                    PM2.5 30
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    보통
                </Typography>
            </Box>
        </Card>
    );
}

export default WeatherCard;


