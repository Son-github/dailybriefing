import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import axios from 'axios';

function ExchangeCard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExchangeRate = async () => {
            try {
                const res = await axios.get('http://localhost:8082/api/exchange');
                console.log('✅ 응답:', res.data); // ← 여기 중요
                setData(res.data); // 전체 객체 저장
            } catch (error) {
                console.error('환율 정보를 불러오지 못했습니다:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchExchangeRate();
    }, []);

    return (
        <Card
            sx={{
                borderRadius: 4,
                boxShadow: '0 4px 12px 0 rgba(0,0,0,0.08)',
                bgcolor: '#ffffff',
            }}
        >
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <MonetizationOnIcon sx={{ color: '#4caf50', mr: 1 }} />
                    <Typography variant="h6" fontWeight="bold">
                        오늘의 환율
                    </Typography>
                </Box>

                {loading ? (
                    <CircularProgress size={24} />
                ) : data ? (
                    <>
                        <Typography variant="h4" fontWeight="bold" sx={{ mt: 1 }}>
                            {data.rate.toLocaleString()} 원
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            기준일: {data.fetchedDate}
                        </Typography>
                    </>
                ) : (
                    <Typography color="error">환율 정보를 불러오지 못했습니다.</Typography>
                )}
            </CardContent>
        </Card>
    );
}

export default ExchangeCard;


