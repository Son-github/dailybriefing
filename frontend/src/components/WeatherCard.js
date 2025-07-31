import React, { useEffect, useState } from 'react';
import { Card, Typography, Box } from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import axios from 'axios';

function WeatherCard() {
    const location = "서울";
    const [temperature, setTemperature] = useState(null);
    const [weatherText, setWeatherText] = useState("");

    useEffect(() => {
        axios.get("http://localhost:8080/weather/fetch")
            .then((res) => {
                const data = res.data;
                const temperatureData = data.response.body.items.item.find(item => item.category === "T1H");
                setTemperature(temperatureData?.fcstValue || "-");

                const skyData = data.response.body.items.item.find(item => item.category === "SKY");
                const skyMap = {1: "맑음", 3: "구름많음", 4: "흐림"};
                setWeatherText(skyMap[skyData?.fcstValue] || "알 수 없음");
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
            <WbSunnyIcon sx={{ fontSize: 48, color: '#FFA726' }} />
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




