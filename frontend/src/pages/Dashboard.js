import React from 'react';
import { Box, Container, Stack } from '@mui/material';

// 1. Dashboard 페이지에서만 사용할 Header를 여기서 가져옵니다.
import Header from '../components/Header';
import InfoCard from '../components/InfoCard';
import WeatherCard from '../components/WeatherCard';
import NewsCard from '../components/NewsCard';

// KOSDAQ, NASDAQ 차트에 사용할 샘플 데이터
const kosdaqData = [
    { name: 'Page A', uv: 4000, pv: 2400, amt: 2400 },
    { name: 'Page B', uv: 3000, pv: 1398, amt: 2210 },
    { name: 'Page C', uv: 2000, pv: 9800, amt: 2290 },
    { name: 'Page D', uv: 2780, pv: 3908, amt: 2000 },
    { name: 'Page E', uv: 1890, pv: 4800, amt: 2181 },
    { name: 'Page F', uv: 2390, pv: 3800, amt: 2500 },
    { name: 'Page G', uv: 3490, pv: 4300, amt: 2100 },
];

const nasdaqData = [
    { name: 'Page A', uv: 2400, pv: 2400, amt: 2400 },
    { name: 'Page B', uv: 2800, pv: 1398, amt: 2210 },
    { name: 'Page C', uv: 3200, pv: 9800, amt: 2290 },
    { name: 'Page D', uv: 3000, pv: 3908, amt: 2000 },
    { name: 'Page E', uv: 3500, pv: 4800, amt: 2181 },
    { name: 'Page F', uv: 3800, pv: 3800, amt: 2500 },
    { name: 'Page G', uv: 4000, pv: 4300, amt: 2100 },
];


function Dashboard() {
    return (
        // 2. App.js에서 옮겨온 배경색상, 패딩 등 레이아웃 Box를 추가합니다.
        <Box sx={{ bgcolor: '#f7f7f7', minHeight: '100vh', pb: 4 }}>
            {/* 3. Header 컴포넌트를 Dashboard 페이지의 최상단에 렌더링합니다. */}
            <Header />

            <Container maxWidth="sm" sx={{ mt: 2 }}>
                <Stack spacing={2}>
                    {/* 환율 카드 */}
                    <InfoCard
                        icon="🇰🇷"
                        title="한율"
                        subtitle="USD/KRW"
                        mainValue="1,372.50"
                        changeValue="-5.50"
                        changeColor="red"
                    />
                    {/* 코스닥 카드 */}
                    <InfoCard
                        iconType="ShowChart"
                        iconColor="blue"
                        title="코스닥"
                        leftValue="838.07"
                        rightValue="838.07"
                        changeValue="-5.63 (-0.67%)"
                        changeColor="blue"
                        chartData={kosdaqData}
                        chartColor="#2196f3"
                    />
                    {/* 나스닥 카드 */}
                    <InfoCard
                        iconType="ShowChart"
                        iconColor="red"
                        title="나스닥"
                        leftValue="12,621.91"
                        rightValue="12,621.91"
                        changeValue="+55.19 (+0.44%)"
                        changeColor="red"
                        chartData={nasdaqData}
                        chartColor="#f44336"
                    />
                    {/* 날씨 카드 */}
                    <WeatherCard />
                    {/* 뉴스 카드 */}
                    <NewsCard />
                </Stack>
            </Container>
        </Box>
    );
}

export default Dashboard;