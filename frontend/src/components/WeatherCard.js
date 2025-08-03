import React, { useEffect, useState } from 'react';
import { Card, Typography } from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CloudIcon from '@mui/icons-material/Cloud';
import GrainIcon from '@mui/icons-material/Grain';
import axios from 'axios';

function WeatherCard() {
    const location = "서울";
    const [temperature, setTemperature] = useState(null);
    const [weatherText, setWeatherText] = useState("");
    const [icon, setIcon] = useState(<WbSunnyIcon sx={{ fontSize: 48, color: '#FFA726' }} />);

    useEffect(() => {
        axios.get("http://localhost:8083/weather/summary")
            .then((res) => {
                const data = res.data;
                setTemperature(data.temperature || "-");
                setWeatherText(data.sky || "알 수 없음");

                // 날씨 상태별 아이콘 변경
                switch (data.sky) {
                    case "맑음":
                        setIcon(<WbSunnyIcon sx={{ fontSize: 48, color: '#FFA726' }} />);
                        break;
                    case "구름많음":
                        setIcon(<CloudIcon sx={{ fontSize: 48, color: '#90A4AE' }} />);
                        break;
                    case "흐림":
                        setIcon(<CloudIcon sx={{ fontSize: 48, color: '#607D8B' }} />);
                        break;
                    case "비":
                        setIcon(<GrainIcon sx={{ fontSize: 48, color: '#42A5F5' }} />);
                        break;
                    default:
                        setIcon(<WbSunnyIcon sx={{ fontSize: 48, color: '#FFA726' }} />);
                }
            })
            .catch(err => console.error(err));
    }, []);

    return (
        <Card
            sx={{
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                py: 3
            }}
        >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {location} 날씨
            </Typography>
            {icon}
            <Typography variant="h4" fontWeight="bold">
                {temperature ? `${temperature}°C` : "로딩중..."}
            </Typography>
            <Typography variant="body1" color="text.secondary">
                {weatherText}
            </Typography>
        </Card>
    );
}

export default WeatherCard;
