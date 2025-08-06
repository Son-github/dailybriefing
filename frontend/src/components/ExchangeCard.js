import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import axios from 'axios';

function ExchangeCard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [animatedRate, setAnimatedRate] = useState(0);

    useEffect(() => {
        const fetchExchangeRate = async () => {
            try {
                const res = await axios.get('http://localhost:8082/api/exchange');
                setData(res.data);
            } catch (error) {
                console.error('환율 정보를 불러오지 못했습니다:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchExchangeRate();
    }, []);

    // ✅ 카운트업 애니메이션
    useEffect(() => {
        if (data?.rate) {
            let start = 0;
            const end = data.rate;
            const duration = 1000; // 1초
            const startTime = performance.now();

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const currentValue = Math.floor(start + (end - start) * progress);
                setAnimatedRate(currentValue);
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            requestAnimationFrame(animate);
        }
    }, [data]);

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
                {/* 상단 아이콘 */}
                <Box
                    sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4caf50, #81c784)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                    }}
                >
                    <MonetizationOnIcon sx={{ color: '#fff', fontSize: 32 }} />
                </Box>

                {/* 타이틀 */}
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                    오늘의 환율
                </Typography>

                {/* 로딩 상태 */}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <CircularProgress size={32} />
                    </Box>
                ) : data ? (
                    <>
                        <Typography
                            variant="h3"
                            fontWeight="bold"
                            sx={{ mt: 1, color: '#333', letterSpacing: '-0.5px' }}
                        >
                            {animatedRate.toLocaleString()} <Typography component="span" variant="h5">원</Typography>
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 1 }}
                        >
                            기준일: {data.fetchedDate}
                        </Typography>
                    </>
                ) : (
                    <Typography color="error" sx={{ textAlign: 'center', py: 2 }}>
                        환율 정보를 불러오지 못했습니다.
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}

export default ExchangeCard;
