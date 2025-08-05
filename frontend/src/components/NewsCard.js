import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Chip, Box } from '@mui/material';
import axios from 'axios';

function NewsCard() {
    const [newsList, setNewsList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get("http://localhost:8084/news/fetch") // 백엔드 API 호출
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
        <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', p: 2, minHeight: 400 }}>
            <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    오늘의 주요 뉴스
                </Typography>

                {loading ? (
                    // 로딩 화면
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '300px',
                            animation: 'fadeIn 0.3s ease-in-out',
                        }}
                    >
                        <Box
                            sx={{
                                width: 60,
                                height: 60,
                                border: '6px solid #e0e0e0',
                                borderTop: '6px solid #1976d2',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                mb: 2,
                            }}
                        />
                        <Typography variant="body1" sx={{ color: '#666' }}>
                            뉴스를 불러오는 중입니다...
                        </Typography>
                    </Box>
                ) : (
                    newsList.map((news, index) => (
                        <Box
                            key={index}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 1.5,
                                p: 1.2,
                                borderRadius: 2,
                                backgroundColor: 'rgba(0,0,0,0.02)',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.05)' },
                                transition: '0.2s'
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
                                    '&:hover': { color: '#1976d2' }
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
                )}
            </CardContent>
        </Card>
    );
}

// 로딩 애니메이션 추가
const styles = document.createElement('style');
styles.innerHTML = `
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
`;
document.head.appendChild(styles);

export default NewsCard;
