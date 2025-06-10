import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

function NewsCard() {
    return (
        <Card sx={{ borderRadius: 4, boxShadow: '0 4px 12px 0 rgba(0,0,0,0.08)' }}>
            <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    뉴스 간단 요약
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    신규 세금 장제이 발표 되어 주요 기업들의 반발을 사고 왔습니다.
                </Typography>
            </CardContent>
        </Card>
    );
}

export default NewsCard;