import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Chip, Box, CircularProgress } from '@mui/material';
import axios from 'axios';

function NewsCard() {
    const [newsList, setNewsList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get("/api/news/fetch")
            .then((res) => {
                setNewsList(res.data.topNews || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const getSentimentColor = (sentiment) => {
        if (sentiment === "Positive") return "success";
        if (sentiment === "Negative") return "error";
        return "default";
    };

    return (
        <Card
            sx={{
                borderRadius: 6,
                boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                bgcolor: '#ffffff',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': { transform: 'scale(1.02)' },
                minHeight: 400,
            }}
        >
            <CardContent
                sx={{
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                }}
            >
                <Typography
                    variant="h6"
                    sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center' }}
                >
                    오늘의 주요 뉴스
                </Typography>

                {loading ? (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: 1,
                            py: 5,
                        }}
                    >
                        <CircularProgress size={40} sx={{ mb: 2 }} />
                        <Typography variant="body1" sx={{ color: '#666' }}>
                            뉴스를 불러오는 중입니다...
                        </Typography>
                    </Box>
                ) : newsList.length > 0 ? (
                    newsList.map((news, index) => (
                        <Box
                            key={index}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 1.5,
                                p: 1.5,
                                borderRadius: 3,
                                backgroundColor: 'rgba(0,0,0,0.02)',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.05)' },
                                transition: '0.2s',
                            }}
                        >
                            <Typography
                                variant="body1"
                                component="a"
                                href={news.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                    textDecoration: 'none',
                                    color: '#333',
                                    fontWeight: 500,
                                    flex: 1,
                                    '&:hover': { color: '#1976d2' },
                                }}
                            >
                                {news.title}
                            </Typography>
                            <Chip
                                label={news.sentiment}
                                color={getSentimentColor(news.sentiment)}
                                size="small"
                                sx={{ ml: 2, fontWeight: 'bold' }}
                            />
                        </Box>
                    ))
                ) : (
                    <Typography textAlign="center" color="text.secondary">
                        현재 표시할 뉴스가 없습니다.
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}

export default NewsCard;
