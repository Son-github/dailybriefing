import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, CircularProgress } from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CloudIcon from '@mui/icons-material/Cloud';
import GrainIcon from '@mui/icons-material/Grain';
import axios from 'axios';

function WeatherCard() {
    const location = "서울";
    const [temperature, setTemperature] = useState(null);
    const [weatherText, setWeatherText] = useState("");
    const [icon, setIcon] = useState(<WbSunnyIcon sx={{ fontSize: 48, color: '#FFA726' }} />);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('${API_BASE}/weather/summary')
            .then((res) => {
                const data = res.data;
                setTemperature(data.temperature || "-");
                setWeatherText(data.sky || "알 수 없음");

                switch (data.sky) {
                    case "맑음":
                        setIcon(<WbSunnyIcon sx={{ fontSize: 56, color: '#FFA726' }} />);
                        break;
                    case "구름많음":
                        setIcon(<CloudIcon sx={{ fontSize: 56, color: '#90A4AE' }} />);
                        break;
                    case "흐림":
                        setIcon(<CloudIcon sx={{ fontSize: 56, color: '#607D8B' }} />);
                        break;
                    case "비":
                        setIcon(<GrainIcon sx={{ fontSize: 56, color: '#42A5F5' }} />);
                        break;
                    default:
                        setIcon(<WbSunnyIcon sx={{ fontSize: 56, color: '#FFA726' }} />);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Card
            sx={{
                borderRadius: 6,
                boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                bgcolor: '#ffffff',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': { transform: 'scale(1.02)' },
            }}
        >
            <CardContent
                sx={{
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                }}
            >
                {/* 위치 */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {location} 날씨
                </Typography>

                {/* 아이콘 (배경 제거 → 심플하게) */}
                {loading ? <CircularProgress size={32} sx={{ my: 2 }} /> : icon}

                {/* 온도 & 설명 */}
                {!loading && (
                    <>
                        <Typography variant="h3" fontWeight="bold" sx={{ color: '#333', mt: 1 }}>
                            {temperature ? `${temperature}°C` : "-"}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                            {weatherText}
                        </Typography>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

export default WeatherCard;
