import React from 'react';
import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';

function WeatherCard() {
    return (
        <Card sx={{ borderRadius: 4, boxShadow: '0 4px 12px 0 rgba(0,0,0,0.08)' }}>
            <CardContent>
                <Grid container spacing={2}>
                    {/* 왼쪽: 날씨 정보 */}
                    <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
                        <WbSunnyIcon sx={{ color: 'orange', fontSize: 40, mr: 1 }} />
                        <Box>
                            <Typography variant="h5">23°C</Typography>
                            <Typography variant="body1">맑음</Typography>
                        </Box>
                    </Grid>
                    {/* 오른쪽: 미세먼지 정보 */}
                    <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box textAlign="center">
                            <Typography variant="body1">PM₂.₅ 30</Typography>
                            <Typography variant="body2" color="text.secondary">오늘</Typography>
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}

export default WeatherCard;